'use client';

import React from 'react';
import { mdxComponents } from './mdx-components';
import { run } from '@mdx-js/mdx';
import * as prodRuntime from 'react/jsx-runtime';
import * as devRuntime from 'react/jsx-dev-runtime';

interface MDXRendererProps {
  compiledSource: string;
  components?: Record<string, React.ComponentType<any>>;
}

/**
 * Client component to render compiled MDX
 */
export function MDXRenderer({ compiledSource, components }: MDXRendererProps) {
  const [Content, setContent] = React.useState<React.ComponentType | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  const mergedComponents = React.useMemo(
    () => ({
      ...mdxComponents,
      ...components,
    }),
    [components]
  );

  React.useEffect(() => {
    async function loadMDX() {
      try {
        // Use dev runtime in development, prod runtime in production
        const runtime = process.env.NODE_ENV === 'development' ? devRuntime : prodRuntime;

        // Run the compiled MDX function body with components
        const { default: MDXContent } = await run(compiledSource, {
          ...runtime,
          baseUrl: import.meta.url,
        });

        // Create wrapper component that passes components
        const WrappedContent = () => <MDXContent components={mergedComponents} />;
        setContent(() => WrappedContent);
      } catch (err) {
        console.error('Error rendering MDX:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    }

    loadMDX();
  }, [compiledSource, mergedComponents]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
        <p className="font-semibold">Error rendering documentation</p>
        <p className="mt-2 text-sm">{error.message}</p>
      </div>
    );
  }

  if (!Content) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mdx-content prose prose-lg max-w-none">
      <Content />
    </div>
  );
}

/**
 * Server component wrapper for MDX rendering
 */
export async function MDXContent({
  compiledSource,
  components,
}: MDXRendererProps) {
  return <MDXRenderer compiledSource={compiledSource} components={components} />;
}
