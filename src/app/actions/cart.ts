"use server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAction, run, ActionError } from "@/lib/auth/guards";
import { addProductToCart, getCartLines, removeCartItem, setCartDiscountCode, getCartCount } from "@/lib/cart";
import { normalizeCode, validateCode, DiscountError } from "@/lib/discounts";
import { toPricingLines, startCheckout } from "@/lib/checkout";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-info";

export async function addToCartAction(productId: string) {
  return run(async () => {
    const user = await getCurrentUser();
    const count = await addProductToCart(user, z.uuid().parse(productId));
    revalidatePath("/[locale]/cart", "page");
    return { cartCount: count };
  });
}

export async function removeFromCartAction(itemId: string) {
  return run(async () => {
    const user = await getCurrentUser();
    const count = await removeCartItem(user, z.uuid().parse(itemId));
    revalidatePath("/[locale]/cart", "page");
    return { cartCount: count };
  });
}

/** Validates and stores a promotional code. Eligibility is re-validated at checkout. */
export async function applyCodeAction(raw: string) {
  return run(async () => {
    const user = await getCurrentUser();
    const locale = await getLocale();
    if (!(await rateLimit(`code:${user?.id ?? await clientIp()}`, LIMITS.discountCode.limit, LIMITS.discountCode.window))) throw new ActionError("rate_limited");
    const code = normalizeCode(raw);
    const { lines } = await getCartLines(user, locale);
    if (!lines.length) throw new ActionError("cart_empty");
    try {
      await validateCode(db, code, user?.id ?? null, toPricingLines(lines.filter((l) => !l.unavailable)), locale);
    } catch (e) {
      if (e instanceof DiscountError) throw new ActionError(e.code, e.values);
      throw e;
    }
    await setCartDiscountCode(user, code);
    revalidatePath("/[locale]/cart", "page");
  });
}

export async function removeCodeAction() {
  return run(async () => {
    await setCartDiscountCode(await getCurrentUser(), null);
    revalidatePath("/[locale]/cart", "page");
  });
}

export async function cartCountAction() {
  return getCartCount(await getCurrentUser());
}

export type CheckoutState = { error?: string; values?: Record<string, string> } | null;

export async function checkoutAction(_: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const locale = await getLocale();
  let url: string;
  try {
    const user = await requireAction("adult");
    url = await startCheckout(user, {
      country: String(fd.get("country") ?? ""),
      locale,
      termsAccepted: fd.get("terms") === "on",
      waiverAccepted: fd.get("waiver") === "on",
    });
  } catch (e) {
    if (e instanceof ActionError) {
      if (e.code === "auth_required") redirect(`/${locale}/auth/login?next=/checkout`);
      if (e.code === "email_unverified") redirect(`/${locale}/auth/verify-email?next=/checkout`);
      if (e.code === "age_unverified") redirect(`/${locale}/verify?next=/checkout`);
      return { error: e.code, values: e.detail };
    }
    throw e;
  }
  redirect(url);
}
