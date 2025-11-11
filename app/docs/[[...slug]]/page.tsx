import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import { publicDocs } from '@/lib/docs/sources';
import { generateTableOfContents } from '@/lib/docs/loader';
import { MDXRenderer } from '@/lib/docs/mdx-renderer';

interface PageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export async function generateStaticParams() {
  const docs = await publicDocs.getDocs();
  return docs.map((doc) => ({
    slug: doc.slugs,
  }));
}

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params;

  // Get the doc (handles both index and nested pages)
  const doc = await publicDocs.getDoc(slug || []);

  if (!doc) {
    notFound();
  }

  const toc = generateTableOfContents(doc.content);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="flex gap-8">
        <main className="flex-1 min-w-0">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground">
              Docs
            </Link>
            {doc.slugs.map((slug, index) => {
              const href = `/docs/${doc.slugs.slice(0, index + 1).join('/')}`;
              const isLast = index === doc.slugs.length - 1;
              return (
                <span key={slug} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  {isLast ? (
                    <span className="text-foreground font-medium">{slug}</span>
                  ) : (
                    <Link href={href} className="hover:text-foreground">
                      {slug}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>

          {/* Title and metadata */}
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold tracking-tight">
              {doc.frontmatter.title}
            </h1>
            {doc.frontmatter.description && (
              <p className="text-lg text-muted-foreground">
                {doc.frontmatter.description}
              </p>
            )}

            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {doc.readingTime}
              </span>
              {doc.frontmatter.author && (
                <span>By {doc.frontmatter.author}</span>
              )}
              {doc.frontmatter.date && (
                <span>{new Date(doc.frontmatter.date).toLocaleDateString()}</span>
              )}
            </div>

            {/* Tags */}
            {doc.frontmatter.tags && doc.frontmatter.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {doc.frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* MDX Content */}
          <article>
            <MDXRenderer compiledSource={doc.compiledSource} />
          </article>
        </main>

        {/* Table of contents sidebar */}
        {toc.length > 0 && (
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-8">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                On This Page
              </h3>
              <nav className="space-y-2">
                {toc.map((item) => (
                  <a
                    key={item.slug}
                    href={`#${item.slug}`}
                    className={`block text-sm hover:text-foreground ${
                      item.level === 1
                        ? 'font-medium'
                        : item.level === 2
                        ? 'ml-4 text-muted-foreground'
                        : 'ml-8 text-muted-foreground'
                    }`}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
