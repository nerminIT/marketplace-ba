import Image from "next/image";
import Link from "next/link";
import type { CategoryNode } from "@/lib/queries";

export default function CategoryGrid({
  categories,
}: {
  categories: CategoryNode[];
}) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/kategorija/${cat.slug}`}
          className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden bg-surface p-5"
        >
          {cat.image_url ? (
            <>
              <Image
                src={cat.image_url}
                alt={cat.name}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
            </>
          ) : null}

          <div className="relative">
            <h3
              className={`text-base font-medium ${
                cat.image_url ? "text-white" : "text-ink"
              }`}
            >
              {cat.name}
            </h3>
            <span
              className={`mt-1 block text-xs ${
                cat.image_url ? "text-white/75" : "text-ink-3"
              }`}
            >
              {cat.product_count} proizvoda
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
