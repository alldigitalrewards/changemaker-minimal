import { publicDocs } from '@/lib/docs/sources';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigation = await publicDocs.getNavigation();

  return (
    <div className="min-h-screen">
      <div className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/docs" className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5" />
            <span>Changemaker Docs</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Home
            </Link>
            <Link
              href="/docs/api-reference"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              API
            </Link>
            <Link
              href="/docs/getting-started"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Getting Started
            </Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar navigation */}
        <aside className="hidden w-64 shrink-0 border-r md:block">
          <nav className="sticky top-0 h-screen overflow-y-auto p-6">
            <div className="space-y-6">
              {navigation.map((item) => (
                <div key={item.slug}>
                  <Link
                    href={`/docs/${item.slug}`}
                    className="block font-semibold text-foreground hover:text-gray-900"
                  >
                    {item.title}
                  </Link>
                  {item.children && item.children.length > 0 && (
                    <ul className="mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                      {item.children.map((child) => (
                        <li key={child.slug}>
                          <Link
                            href={`/docs/${child.slug}`}
                            className="block text-sm text-muted-foreground hover:text-foreground"
                          >
                            {child.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
