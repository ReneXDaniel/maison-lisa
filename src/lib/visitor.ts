import "server-only";
import { cache } from "react";
import { getCurrentUser } from "./auth/session";
import { getCartLines, ownedProductIds } from "./cart";

/** Per-request view of the visitor used to render cart/ownership/preview states. */
export const visitorState = cache(async (locale: string) => {
  const user = await getCurrentUser();
  const [{ lines }, owned] = await Promise.all([getCartLines(user, locale), user ? ownedProductIds(user.id) : Promise.resolve(new Set<string>())]);
  return {
    user,
    inCart: new Set(lines.map((l) => l.productId).filter(Boolean) as string[]),
    owned,
    canViewVerified: !!user && (user.isAdultVerified || user.isAdmin),
  };
});
