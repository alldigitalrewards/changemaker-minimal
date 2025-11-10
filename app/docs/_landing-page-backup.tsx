import Link from 'next/link'
import { Code, BookOpen, Wrench, HelpCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Documentation - Changemaker',
  description: 'Developer documentation, API reference, and guides for the Changemaker platform',
}

export default function DocsLandingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Documentation</h1>
        <p className="text-lg text-muted-foreground">
          Everything you need to integrate with and build on the Changemaker platform.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>Public API Reference</CardTitle>
            <CardDescription>
              Complete API reference with request/response examples for all public endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/docs/public-api">View API Reference</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
              <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Learn the basics of authentication, making your first API calls, and handling errors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/help/docs">Read Guide</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
              <Wrench className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle>Developer Guides</CardTitle>
            <CardDescription>
              In-depth guides for common integration patterns and advanced use cases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled variant="outline">
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <HelpCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle>Support</CardTitle>
            <CardDescription>
              Get help, report issues, or connect with the Changemaker community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/contact">Contact Support</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/20">
        <h2 className="mb-2 text-lg font-semibold">Need Admin API Documentation?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Workspace administrators have access to additional internal API documentation with full CRUD operations for challenges, participants, and more.
        </p>
        <p className="text-sm text-muted-foreground">
          Navigate to your workspace admin panel to access the internal API reference.
        </p>
      </div>
    </main>
  )
}
