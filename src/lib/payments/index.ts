import "server-only";
import { assertProductionSafety, env } from "@/lib/env";
import { DevPaymentProvider } from "./providers/dev";
import { VerotelProvider } from "./providers/verotel";
import type { PaymentProvider } from "./types";

export function paymentProvider(id?: string): PaymentProvider {
  assertProductionSafety();
  const which = id ?? env().PAYMENT_PROVIDER;
  if (which === "verotel") return new VerotelProvider();
  if (which === "dev") return new DevPaymentProvider();
  throw new Error(`Unknown payment provider: ${which}`);
}
