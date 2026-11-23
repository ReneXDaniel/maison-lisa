import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { OrderReturn } from "@/components/shop/order-return";
import { requirePage } from "@/lib/auth/guards";

export default async function CheckoutReturnPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ order?: string; cancelled?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  await requirePage(locale, "user", `/checkout/return?order=${sp.order ?? ""}`);
  await getTranslations("checkout");
  return (
    <Container className="max-w-2xl pb-28 pt-40">
      <OrderReturn orderId={sp.order ?? ""} cancelled={sp.cancelled === "1"} />
    </Container>
  );
}
