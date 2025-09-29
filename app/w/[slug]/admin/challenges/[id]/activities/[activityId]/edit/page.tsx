import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string; id: string; activityId: string }>
}

export default async function EditActivityPage({ params }: PageProps) {
  const { slug, id, activityId } = await params
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
          <h1 className="text-xl font-semibold">Edit Activity</h1>
        </div>
      </div>
      <div className="text-sm text-gray-600">Activity editor is currently integrated in the challenge Edit page. Placeholder for decoupled editor. Activity: {activityId}</div>
    </div>
  )
}


