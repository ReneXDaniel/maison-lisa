type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Returns a new object with `over` merged recursively onto `base`. */
export function deepMerge<T extends Obj>(base: T, over: Obj): T {
  const out: Obj = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] = isObj(b) && isObj(v) ? deepMerge(b, v) : v;
  }
  return out as T;
}

/** Picks top-level namespaces from a messages object. */
export function pick<T extends Obj>(obj: T, keys: readonly string[]): Obj {
  const out: Obj = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}
