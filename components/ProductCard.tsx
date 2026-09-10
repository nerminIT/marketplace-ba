import Image from "next/image";
import Link from "next/link";
import { formatKM } from "@/lib/money";
import type { ProductCardData } from "@/lib/queries";

function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const price = Number(product.price_bam);
  const compareAt =
    product.compare_at_bam === null ? null : Number(product.compare_at_bam);
  const discount = discountPercent(price, compareAt);
  const soldOut = product.stock <= 0;

  return (
    <Link
      href={`/proizvod/${product.slug}`}
      className="group relative flex h-full flex-col bg-surface transition-colors hover:bg-brand-soft/40"
    >
      <div className="relative aspect-square overflow-hidden bg-ground">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-3">
            bez slike
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discount !== null ? (
            <span className="chip bg-sale text-white">-{discount}%</span>
          ) : null}
          {product.is_new && discount === null ? (
            <span className="chip bg-ink text-white">Novo</span>
          ) : null}
        </div>

        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
            <span className="chip border border-line-strong bg-surface text-ink-2">
              Rasprodano
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-line p-4">
        {product.category_name ? (
          <span className="mb-1.5 text-[11px] tracking-wide text-ink-3 uppercase">
            {product.category_name}
          </span>
        ) : null}

        <h3 className="mb-3 line-clamp-2 text-sm leading-snug font-medium text-ink transition-colors group-hover:text-brand">
          {product.name}
        </h3>

        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-base font-semibold text-ink">
            {formatKM(price)}
          </span>
          {compareAt && compareAt > price ? (
            <span className="text-xs text-ink-3 line-through">
              {formatKM(compareAt)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
