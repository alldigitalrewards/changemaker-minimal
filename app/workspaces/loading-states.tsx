import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function WorkspaceCardSkeleton() {
  return (
    <Card className="min-h-[260px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 pt-2">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="mt-auto">
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function WorkspacesSummaryStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-10 w-10 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function WorkspacesSectionSkeleton({ title, count = 3 }: { title: string; count?: number }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <WorkspaceCardSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function WorkspacesPageSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="h-1 bg-gradient-to-r from-coral-500 to-terracotta-600" />
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Skeleton className="h-8 w-32" />
              <div className="border-l border-gray-200 pl-6 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="container mx-auto py-8 px-6 space-y-8">
            <WorkspacesSummaryStatsSkeleton />
            <WorkspacesSectionSkeleton title="Your Workspaces" count={3} />
          </div>
        </main>
      </div>
    </div>
  )
}
