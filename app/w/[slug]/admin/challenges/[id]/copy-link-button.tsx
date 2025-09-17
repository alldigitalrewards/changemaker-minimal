'use client'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Link as LinkIcon, Copy } from 'lucide-react'
import { useState } from 'react'

export function CopyLinkButton({ href }: { href: string }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(href)
      setCopied(true)
      toast({ title: 'Link copied', description: 'Share this link with your team.' })
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      toast({ title: 'Copy failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <Button aria-label="Copy link" variant="outline" onClick={onCopy} title={href}>
      {copied ? <Copy className="h-4 w-4 mr-2" /> : <LinkIcon className="h-4 w-4 mr-2" />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  )
}


