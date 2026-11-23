import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP recommended argon2id baseline (m=19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export const hashPassword = (password: string) => hash(password, OPTIONS);

export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

/** A real hash used to equalise timing when the email does not exist. */
let dummy: string | null = null;
export async function dummyVerify(password: string) {
  dummy ??= await hashPassword("timing-equaliser-not-a-real-password");
  await verifyPassword(dummy, password);
}
