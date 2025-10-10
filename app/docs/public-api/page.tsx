import { Metadata } from 'next'
import RedocViewer from '@/components/docs/redoc-viewer'

export const metadata: Metadata = {
  title: 'Public API | Changemaker Docs',
  description: 'Reference documentation for the Changemaker public REST API.',
}

export default function PublicApiDocsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16">
      <section className="space-y-4 pb-6 pt-10">
        <p className="text-sm text-muted-foreground">
          This reference is generated from the OpenAPI specification committed at{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">public/api/public-openapi.yaml</code>.
          Contribution and validation guidelines live in{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/operations/api-docs.md</code>.
        </p>
      </section>
      <RedocViewer specUrl="/api/public-openapi.yaml" title="Changemaker Public API" />
    </main>
  )
}
