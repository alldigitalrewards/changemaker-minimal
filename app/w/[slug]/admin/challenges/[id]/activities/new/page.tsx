import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export default async function NewActivityPage({ params }: PageProps) {
  const { slug, id } = await params
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/w/${slug}/admin/challenges/${id}/activities`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Activities
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Create Activity</h1>
        </div>
      </div>
      <div className="text-sm text-gray-600">Use the Edit page to manage activities for now. This route is a placeholder for future decoupled create form.</div>
    </div>
  )
}


