"use client";
import { useTranslations } from "next-intl";
import { ActionButton } from "./forms";
import { deleteMediaAction, setProductCoverAction, updateMediaAction } from "@/app/actions/admin";

type M = { id: string; kind: string; visibility: string; fileName: string; width: number | null; height: number | null; isCover?: boolean };

/** Product media management: previews (public / verified-only) and private originals. */
export function ProductMediaGrid({ productId, items }: { productId: string; items: M[] }) {
  const t = useTranslations("admin.products");
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((m) => (
        <li key={m.id} className="border border-champagne/50 bg-ivory-100 p-3 text-xs">
          {m.kind === "product_preview" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/media/${m.id}?w=480`} alt="" className="mb-2 aspect-[4/5] w-full object-cover" />
          ) : (
            <div className="dark-surface mb-2 flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 bg-espresso p-2 text-center text-champagne">
              <span className="eyebrow">{t("original")}</span>
              <span className="text-[10px] text-champagne-200">{t("privateNote")}</span>
            </div>
          )}
          <p className="truncate font-semibold">{m.fileName}</p>
          <p className="text-taupe-700">{m.width}×{m.height} · {m.kind === "product_preview" ? t(`vis.${m.visibility}`) : t("vis.private")}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {m.kind === "product_preview" && !m.isCover && <ActionButton action={setProductCoverAction.bind(null, productId, m.id)} label={t("setCover")} />}
            {m.isCover && <span className="eyebrow px-2 py-2 text-success">{t("cover")}</span>}
            {m.kind === "product_preview" && (
              <ActionButton action={updateMediaAction.bind(null, m.id, { visibility: m.visibility === "public" ? "verified" : "public" })} label={m.visibility === "public" ? t("makeVerified") : t("makePublic")} />
            )}
            <ActionButton action={deleteMediaAction.bind(null, m.id)} label="✕" confirm={t("deleteConfirm")} variant="danger" />
          </div>
        </li>
      ))}
    </ul>
  );
}
