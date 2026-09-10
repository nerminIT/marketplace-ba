import ProductCard from "./ProductCard";
import type { ProductCardData } from "@/lib/queries";

export default function ProductGrid({
  products,
  columns = 4,
}: {
  products: ProductCardData[];
  columns?: 3 | 4;
}) {
  if (products.length === 0) return null;

  const cols =
    columns === 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    // Hairline mreza: razmak od 1px preko pozadine u boji linije daje
    // tanke pregrade izmedju kartica bez duplih ivica.
    <div
      className={`grid grid-cols-2 gap-px border border-line bg-line ${cols}`}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
