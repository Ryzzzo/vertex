/**
 * A screenshot with an explicit srcset.
 *
 * Vercel's image optimizer passes AVIF sources through unresized, so
 * `next/image` was handing every card the full 3840px capture. The browser
 * then downscaled a 4K bitmap to ~536px on the GPU — no mipmaps, so fine UI
 * text shimmered — and seven of those decoded at once stalled the compositor
 * during the hover scale, which is what read as ghosting.
 *
 * The variants are built once by `scripts/build-shot-variants.py` from the
 * `*-desktop.avif` master. `src` still points at the master so content.ts is
 * unchanged; the widths are derived from it here.
 */

const WIDTHS = [640, 960, 1280, 1920] as const;

function variant(src: string, width: number, ext: "avif" | "webp") {
  return `${src.replace(/\.avif$/, "")}-${width}.${ext}`;
}

function srcSet(src: string, ext: "avif" | "webp") {
  return WIDTHS.map((w) => `${variant(src, w, ext)} ${w}w`).join(", ");
}

export default function Shot({
  src,
  alt,
  sizes,
  className = "card-shot",
  priority = false,
}: {
  src: string;
  alt: string;
  /** Same contract as `next/image`: the rendered width, for candidate choice. */
  sizes: string;
  className?: string;
  /** Above-the-fold shots load eagerly and at high fetch priority. */
  priority?: boolean;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(src, "avif")} sizes={sizes} />
      <img
        src={variant(src, 1280, "webp")}
        srcSet={srcSet(src, "webp")}
        sizes={sizes}
        alt={alt}
        width={1920}
        height={1080}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
