import clsx from "clsx";
import type { MediaRef } from "@/lib/catalog";
import { IconLock } from "@/components/ui/icons";

/**
 * Responsive image from the media pipeline. Verified-only previews render a
 * locked placeholder for visitors who may not see them — the image URL is
 * never even emitted (and the server would refuse it anyway).
 */
export function MediaImage({
  media,
  alt,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  className,
  imgClassName,
  priority,
  canViewVerified = false,
  lockedLabel,
}: {
  media: MediaRef | null;
  alt: string;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  canViewVerified?: boolean;
  lockedLabel?: string;
}) {
  if (!media || (media.visibility === "verified" && !canViewVerified)) {
    return (
      <div className={clsx("relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-champagne-200 via-ivory-300 to-taupe/60", className)} role="img" aria-label={lockedLabel ?? alt}>
        <div className="absolute inset-0 opacity-50 [background:radial-gradient(80%_60%_at_30%_20%,rgb(247_242_235/0.8),transparent_60%)]" />
        {media && (
          <span className="relative flex flex-col items-center gap-2 px-6 text-center text-espresso">
            <IconLock size={22} />
            {lockedLabel && <span className="eyebrow max-w-[14rem] leading-relaxed">{lockedLabel}</span>}
          </span>
        )}
      </div>
    );
  }
  const srcSet = [...media.variants]
    .sort((a, b) => a.width - b.width)
    .map((v) => `/api/media/${media.id}?w=${v.width} ${v.width}w`)
    .join(", ");
  return (
    <div className={clsx("relative overflow-hidden bg-ivory-200", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/media/${media.id}?w=960`}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt || media.alt}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        draggable={false}
        onContextMenu={undefined}
        className={clsx("h-full w-full object-cover", imgClassName)}
      />
    </div>
  );
}
