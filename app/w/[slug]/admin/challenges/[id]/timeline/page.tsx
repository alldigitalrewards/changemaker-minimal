import { getChallengeEvents } from '@/lib/db/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Timeline } from '../timeline'
import { Clock } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export default async function TimelinePage({ params }: PageProps) {
  const { id } = await params
  const events = await getChallengeEvents(id)
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Chronological activity</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-600">No activity yet</p>
            </div>
          ) : (
            <Timeline events={events as any} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}


