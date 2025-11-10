'use client';

import React, { useMemo } from 'react';
import { MDXProvider } from '@mdx-js/react';
import { mdxComponents } from './mdx-components';
import { run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';

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

  React.useEffect(() => {
    async function loadMDX() {
      try {
        // Run the compiled MDX function body
        const { default: MDXContent } = await run(compiledSource, {
          ...runtime,
          baseUrl: import.meta.url,
        });
        setContent(() => MDXContent);
      } catch (err) {
        console.error('Error rendering MDX:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    }

    loadMDX();
  }, [compiledSource]);

  const mergedComponents = {
    ...mdxComponents,
    ...components,
  };

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
    <MDXProvider components={mergedComponents}>
      <div className="mdx-content">
        <Content />
      </div>
    </MDXProvider>
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
