import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";

/**
 * Access levels, from least to most privileged:
 *  - "user":  signed in (email may be unverified)
 *  - "email": signed in with a verified email address
 *  - "adult": verified email + successful, unexpired identity-based age verification
 *  - "admin": Lisa / creator administration (never exposed to customers)
 *
 * These checks run on the server for every protected page, server action and
 * route handler. Client-side UI hints are a convenience only.
 */
export type AccessLevel = "user" | "email" | "adult" | "admin";

export type ActionErrorCode =
  | "auth_required"
  | "email_unverified"
  | "age_unverified"
  | "forbidden"
  | "blocked"
  | "rate_limited"
  | "invalid"
  | "not_found"
  | "conflict"
  | "server";

export class ActionError extends Error {
  constructor(
    public code: ActionErrorCode | string,
    public detail?: Record<string, string>,
  ) {
    super(code);
  }
}

/** Only allow same-site relative paths as post-login targets (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.length > 500) return fallback;
  return next;
}

export function checkLevel(user: CurrentUser | null, level: AccessLevel): ActionErrorCode | null {
  if (!user) return "auth_required";
  if (level === "admin") return user.isAdmin ? null : "forbidden";
  if (user.blocked && level !== "user") return "blocked";
  if (level === "user") return null;
  if (!user.emailVerified) return "email_unverified";
  if (level === "email") return null;
  if (user.isAdmin) return null; // the creator does not need to verify against her own boutique
  return user.isAdultVerified ? null : "age_unverified";
}

/** Page guard: redirects to the step the visitor needs next and returns them afterwards. */
export async function requirePage(locale: string, level: AccessLevel, returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const problem = checkLevel(user, level);
  const next = encodeURIComponent(safeNext(returnTo));
  // The admin area answers 404 to everyone who is not an admin — signed in
  // or not — so its existence is never revealed. Lisa signs in through the
  // normal login page, which forwards admins to /admin.
  if (level === "admin" && problem !== null) notFound();
  switch (problem) {
    case null:
      return user!;
    case "auth_required":
      redirect(`/${locale}/auth/login?next=${next}`);
    case "email_unverified":
      redirect(`/${locale}/auth/verify-email?next=${next}`);
    case "age_unverified":
      redirect(`/${locale}/verify?next=${next}`);
    case "blocked":
      redirect(`/${locale}/account?restricted=1`);
    default:
      notFound(); // never reveal that an admin area exists
  }
}

/** Server action / route guard: throws ActionError instead of redirecting. */
export async function requireAction(level: AccessLevel): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const problem = checkLevel(user, level);
  if (problem) throw new ActionError(problem);
  return user!;
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fields?: Record<string, string> };

/** Wraps a server action body, converting thrown ActionErrors into serialisable results. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data } as ActionResult<T>;
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.code, fields: e.detail };
    // Next.js uses thrown errors for redirect()/notFound(); let them propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[action]", e);
    return { ok: false, error: "server" };
  }
}
