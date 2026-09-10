import Image from "next/image";
import Link from "next/link";
import type { PostCardData } from "@/lib/queries";

function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("bs-BA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PostGrid({ posts }: { posts: PostCardData[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/blog/${post.slug}`}
          className="group flex flex-col bg-surface"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-ground">
            {post.cover_url ? (
              <Image
                src={post.cover_url}
                alt={post.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}
          </div>

          <div className="flex flex-1 flex-col p-5">
            <h3 className="mb-2 line-clamp-2 text-base leading-snug font-medium text-ink transition-colors group-hover:text-brand">
              {post.title}
            </h3>

            {post.excerpt ? (
              <p className="mb-4 line-clamp-2 text-sm text-ink-2">
                {post.excerpt}
              </p>
            ) : null}

            <div className="mt-auto flex items-center gap-2 text-xs text-ink-3">
              {post.published_at ? <span>{formatDate(post.published_at)}</span> : null}
              {post.author ? <span>· {post.author}</span> : null}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
