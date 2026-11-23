"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Button, ButtonLink, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { IconBag, IconCheck } from "@/components/ui/icons";
import { useUI } from "@/stores/ui";
import { addToCartAction } from "@/app/actions/cart";

export function AddToCartButton({
  productId,
  title,
  inCart: initialInCart,
  owned,
  variant = "primary",
  size = "md",
  className,
}: {
  productId: string;
  title: string;
  inCart?: boolean;
  owned?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const t = useTranslations("common");
  const e = useTranslations("errors");
  const setCartCount = useUI((s) => s.setCartCount);
  const toast = useUI((s) => s.toast);
  const [inCart, setInCart] = useState(!!initialInCart);
  const [pending, start] = useTransition();

  if (owned)
    return (
      <ButtonLink href="/account/purchases" variant="secondary" size={size} className={className}>
        <IconCheck size={14} />
        {t("owned")}
      </ButtonLink>
    );
  if (inCart)
    return (
      <ButtonLink href="/cart" variant="secondary" size={size} className={className} data-testid="in-cart">
        <IconCheck size={14} />
        {t("inCart")}
      </ButtonLink>
    );

  return (
    <Button
      variant={variant}
      size={size}
      loading={pending}
      className={clsx(className)}
      data-testid="add-to-cart"
      onClick={() =>
        start(async () => {
          const res = await addToCartAction(productId);
          if (!res.ok) {
            toast({ tone: "error", title: e.has(res.error) ? e(res.error) : e("server") });
            return;
          }
          setCartCount(res.data.cartCount);
          setInCart(true);
          toast({ tone: "success", title: t("added"), body: t("addedBody", { title }), href: "/cart" });
        })
      }
    >
      <IconBag size={15} />
      {t("addToCart")}
    </Button>
  );
}
