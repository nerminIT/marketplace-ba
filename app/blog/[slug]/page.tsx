import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PostGrid from "@/components/PostGrid";
import SectionHeading from "@/components/SectionHeading";
import { getLatestPosts, getPostBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

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

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return { title: "Objava nije pronađena" };

  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || undefined,
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const latest = (await getLatestPosts(4)).filter((p) => p.slug !== post.slug);

  const tags = (post.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const meta = [formatDate(post.published_at), post.author]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title={post.title}
        subtitle={post.excerpt}
        crumbs={[
          { label: "Početna", href: "/" },
          { label: "Blog", href: "/blog" },
        ]}
        meta={meta || undefined}
      />

      <Container size="narrow">
        <article className="py-12 sm:py-16">
          {post.cover_url ? (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden border border-line bg-ground">
              <Image
                src={post.cover_url}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          ) : null}

          {post.content ? (
            <div
              className="prose-bs"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : null}

          {tags.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
              {tags.map((tag) => (
                <span key={tag} className="chip bg-brand-soft text-brand">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-10 text-center">
            <Link href="/blog" className="btn-outline">
              Sve objave
            </Link>
          </div>
        </article>
      </Container>

      {latest.length > 0 ? (
        <section className="border-t border-line bg-surface py-16">
          <Container>
            <SectionHeading eyebrow="Nastavite čitati" title="Ostale objave" />
            <PostGrid posts={latest.slice(0, 3)} />
          </Container>
        </section>
      ) : null}
    </>
  );
}
