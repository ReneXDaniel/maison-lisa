/**
 * Verifies translations against English:
 *  - every key exists in every locale (except documented exceptions)
 *  - no stray keys
 *  - ICU placeholders match ({name}, plurals …)
 *  - every message parses as valid ICU
 *
 *   npm run i18n:check
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { IntlMessageFormat } from "intl-messageformat";

type Obj = Record<string, unknown>;
const root = path.resolve("messages");
const locales = ["de", "fr", "es", "it", "nl", "pl", "pt"];
/** Namespaces intentionally not translated everywhere (fallback to English is by design). */
const OPTIONAL: Record<string, string[]> = {
  admin: ["fr", "es", "it", "nl", "pl", "pt"], // creator dashboard: German + English
  legal: ["fr", "es", "it", "nl", "pl", "pt"], // legal templates: German (authoritative) + English, pending legal review
  dev: ["de", "fr", "es", "it", "nl", "pl", "pt"], // development-only tooling pages
};

function flatten(o: Obj, prefix = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) for (const [kk, vv] of flatten(v as Obj, key)) out.set(kk, vv);
    else out.set(key, v);
  }
  return out;
}

type El = { type: number; value?: string; options?: Record<string, { value: El[] }>; children?: El[] };
/** Argument names from the parsed ICU AST (plural/select branch text is not an argument). */
function placeholders(msg: string): Set<string> {
  const out = new Set<string>();
  const walk = (els: El[]) => {
    for (const e of els) {
      if (e.type !== 0 && e.type !== 7 && typeof e.value === "string") out.add(e.value);
      if (e.options) for (const o of Object.values(e.options)) walk(o.value);
      if (e.children) walk(e.children);
    }
  };
  try {
    walk(new IntlMessageFormat(msg, "en").getAst() as unknown as El[]);
  } catch {
    /* reported elsewhere */
  }
  return out;
}

let errors = 0;
let warnings = 0;
const namespaces = readdirSync(path.join(root, "en")).filter((f) => f.endsWith(".json"));
for (const file of namespaces) {
  const ns = file.replace(".json", "");
  const en = flatten(JSON.parse(readFileSync(path.join(root, "en", file), "utf8")));
  for (const [k, v] of en) {
    if (typeof v === "string") {
      try {
        new IntlMessageFormat(v, "en");
      } catch (e) {
        console.error(`✗ en/${ns}: ${k} invalid ICU — ${(e as Error).message}`);
        errors++;
      }
    }
  }
  for (const l of locales) {
    const other = flatten(JSON.parse(readFileSync(path.join(root, l, file), "utf8")));
    const optional = OPTIONAL[ns]?.includes(l);
    const missing = [...en.keys()].filter((k) => !other.has(k));
    if (missing.length && !optional) {
      console.error(`✗ ${l}/${ns}: ${missing.length} missing (${missing.slice(0, 6).join(", ")}${missing.length > 6 ? ", …" : ""})`);
      errors += missing.length;
    } else if (missing.length) warnings++;
    for (const k of other.keys()) if (!en.has(k)) {
      console.error(`✗ ${l}/${ns}: extra key ${k}`);
      errors++;
    }
    for (const [k, v] of other) {
      const ev = en.get(k);
      if (typeof v !== "string" || typeof ev !== "string") continue;
      try {
        new IntlMessageFormat(v, l);
      } catch (e) {
        console.error(`✗ ${l}/${ns}: ${k} invalid ICU — ${(e as Error).message}`);
        errors++;
      }
      const a = placeholders(ev);
      const b = placeholders(v);
      const diff = [...a].filter((x) => !b.has(x)).concat([...b].filter((x) => !a.has(x)));
      if (diff.length) {
        console.error(`✗ ${l}/${ns}: ${k} placeholder mismatch (${diff.join(", ")})`);
        errors++;
      }
    }
  }
}
console.log(errors ? `\n${errors} problem(s) found` : `✓ translations complete and valid (${namespaces.length} namespaces × ${locales.length + 1} locales; ${warnings} documented fallbacks)`);
process.exit(errors ? 1 : 0);
