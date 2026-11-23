import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminPage, Table, Td } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { MediaImage } from "@/components/shop/media-image";
import { requirePage } from "@/lib/auth/guards";
import { listProducts } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";

export default async function AdminProducts({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/products");
  const t = await getTranslations("admin.products");
  const items = await listProducts(locale, { includeDrafts: true });
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")} actions={<ButtonLink href="/admin/products/new" data-testid="new-product">{t("new")}</ButtonLink>}>
      <Table head={["", t("name"), t("collection"), t("price"), t("images"), t("status")]}>
        {items.map((p) => (
          <tr key={p.id}>
            <Td className="w-16"><MediaImage media={p.cover} alt="" className="aspect-square w-12" canViewVerified sizes="48px" /></Td>
            <Td><Link href={`/admin/products/${p.id}`} className="font-semibold text-espresso link-underline">{p.title}</Link>{p.featured && <Badge className="ml-2" tone="champagne">★</Badge>}</Td>
            <Td className="text-taupe-700">{p.collection?.title ?? "—"}</Td>
            <Td>{formatMoney(p.priceCents, locale)}</Td>
            <Td>{p.imageCount}</Td>
            <Td><Badge tone={p.status === "published" ? "success" : "neutral"}>{t(`status.${p.status}`)}</Badge></Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
