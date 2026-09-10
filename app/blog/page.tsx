import type { Metadata } from "next";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PostGrid from "@/components/PostGrid";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { listPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description: "Savjeti, vodiči i novosti iz naše ponude.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Number(raw || 1) || 1;

  const { items, pages, page: current } = await listPosts(page, 9);

  return (
    <>
      <PageHeader
        title="Blog"
        subtitle="Savjeti, vodiči i novosti - kratko i korisno."
        crumbs={[{ label: "Početna", href: "/" }, { label: "Blog" }]}
      />

      <Container>
        <div className="py-12 sm:py-16">
          {items.length === 0 ? (
            <EmptyState
              title="Još nema objava"
              description="Prvi tekstovi stižu uskoro."
              actionHref="/shop"
              actionLabel="Pogledaj ponudu"
            />
          ) : (
            <>
              <PostGrid posts={items} />
              <Pagination page={current} pages={pages} basePath="/blog" />
            </>
          )}
        </div>
      </Container>
    </>
  );
}
