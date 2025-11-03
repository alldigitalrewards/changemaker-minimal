import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth'
import { getCurrentWorkspace } from '@/lib/workspace-context'
import RedocViewer from '@/components/docs/redoc-viewer'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata = {
  title: 'Internal API Documentation - Changemaker',
  description: 'Complete API reference for workspace administrators with full CRUD operations',
}

export default async function AdminApiDocsPage({ params }: Props) {
  const { slug } = await params

  try {
    await requireWorkspaceAdmin(slug)
  } catch (error) {
    redirect(`/w/${slug}`)
  }

  const workspace = await getCurrentWorkspace(slug)

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16">
      <div className="mb-8 flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Internal API Documentation</h1>
          <p className="text-muted-foreground">
            Complete API reference for {workspace.name} administrators
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Admin Access Only
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              This documentation contains internal API endpoints that require workspace administrator
              privileges. These endpoints provide full CRUD access to challenges, participants, email
              templates, and other administrative resources.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
        <h2 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
          What's Included
        </h2>
        <ul className="ml-4 list-disc space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>Challenge management (create, update, delete, list)</li>
          <li>Participant operations (enrollment, bulk import, export)</li>
          <li>Email system (templates, settings, test sending)</li>
          <li>Activity template management</li>
          <li>Workspace user and role management</li>
          <li>Administrative controls and analytics</li>
        </ul>
      </div>

      <RedocViewer
        specUrl="/api/generated-openapi.yaml"
        title="Changemaker Internal API"
      />
    </main>
  )
}
