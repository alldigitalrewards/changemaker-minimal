'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Mail, UserMinus, UsersRound, Link as LinkIcon, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ParticipantsBulkActionsProps {
  workspaceSlug: string
  challengeId: string
  enrollments: Array<{
    id: string
    status: 'INVITED' | 'ENROLLED' | 'WITHDRAWN'
    user: { id: string; email: string }
  }>
}

export function ParticipantsBulkActions({ workspaceSlug, challengeId, enrollments }: ParticipantsBulkActionsProps) {
  const { toast } = useToast()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const invited = useMemo(() => enrollments.filter(e => e.status === 'INVITED'), [enrollments])
  const enrolled = useMemo(() => enrollments.filter(e => e.status === 'ENROLLED'), [enrollments])

  const handleResendInvites = async () => {
    setLoadingAction('resend')
    try {
      // Placeholder: integrate real email service later
      await new Promise(r => setTimeout(r, 600))
      toast({ title: 'Invites resent', description: `Resent to ${invited.length} invited participants.` })
    } finally {
      setLoadingAction(null)
    }
  }

  const handleBulkUnenroll = async () => {
    setLoadingAction('unenroll')
    try {
      // Placeholder: integrate API endpoint when available
      await new Promise(r => setTimeout(r, 600))
      toast({ title: 'Bulk unenroll queued', description: `${enrolled.length} enrollments will be removed.` })
    } finally {
      setLoadingAction(null)
    }
  }

  const handleExportCsv = () => {
    const rows = [['email', 'status'] as string[]]
    enrollments.forEach(e => rows.push([e.user.email, e.status]))
    const csv = rows.map(r => r.map(v => `"${v.replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `challenge-${challengeId}-participants.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyInviteLink = async () => {
    const url = `${window.location.origin}/w/${workspaceSlug}/admin/challenges/${challengeId}?tab=participants`
    await navigator.clipboard.writeText(url)
    toast({ title: 'Invite link copied', description: 'Share this link with teammates to manage invitations.' })
  }

  const handleImportCsv = async () => {
    // Placeholder: open a file input to parse CSV later
    toast({ title: 'Import CSV (coming soon)', description: 'We will parse a CSV of emails to invite/enroll.' })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleCopyInviteLink}>
        <LinkIcon className="h-4 w-4 mr-2" />
        Invite Link
      </Button>
      <Button variant="outline" onClick={handleResendInvites} disabled={invited.length === 0 || loadingAction !== null}>
        <Mail className="h-4 w-4 mr-2" />
        {loadingAction === 'resend' ? 'Resending…' : `Resend Invites (${invited.length})`}
      </Button>
      <Button variant="outline" onClick={handleBulkUnenroll} disabled={enrolled.length === 0 || loadingAction !== null}>
        <UserMinus className="h-4 w-4 mr-2" />
        {loadingAction === 'unenroll' ? 'Unenrolling…' : `Bulk Unenroll (${enrolled.length})`}
      </Button>
      <Button variant="outline" onClick={handleExportCsv}>
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
      <Button variant="outline" onClick={handleImportCsv}>
        <Upload className="h-4 w-4 mr-2" />
        Import CSV
      </Button>
    </div>
  )
}


