'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Bot, User, Send, Loader2, Save, Code } from 'lucide-react'
import { EmailPreview } from '@/components/emails/email-preview'
import { cn } from '@/lib/utils'
import { EmailTemplateType } from '@prisma/client'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIConversationPanelProps {
  workspaceSlug: string
  workspaceName: string
  brandColor?: string
  initialTemplate?: {
    id: string
    name: string | null
    type: EmailTemplateType
    subject: string | null
    html: string | null
    conversationHistory?: ConversationMessage[]
  }
  onSave?: (data: {
    subject: string
    html: string
    conversationHistory: ConversationMessage[]
  }) => void
}

export function AIConversationPanel({
  workspaceSlug,
  workspaceName,
  brandColor,
  initialTemplate,
  onSave,
}: AIConversationPanelProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>(
    initialTemplate?.conversationHistory || []
  )
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentHtml, setCurrentHtml] = useState(initialTemplate?.html || '')
  const [currentSubject, setCurrentSubject] = useState(initialTemplate?.subject || '')
  const [showHtmlEditor, setShowHtmlEditor] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return

    const userMessage: ConversationMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsGenerating(true)

    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/emails/ai-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage.content,
          conversationHistory: messages,
          existingHtml: currentHtml,
          existingSubject: currentSubject,
          templateType: initialTemplate?.type || 'GENERIC',
          workspaceName,
          brandColor,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate email')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream available')
      }

      let accumulatedHtml = ''
      let accumulatedSubject = ''
      let isReadingSubject = true

      // Add assistant message placeholder
      const assistantMessageIndex = messages.length + 1
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Generating...',
          timestamp: new Date(),
        },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.subject) {
                accumulatedSubject = data.subject
                setCurrentSubject(accumulatedSubject)
              }

              if (data.html) {
                accumulatedHtml = data.html
                setCurrentHtml(accumulatedHtml)
              }

              if (data.done) {
                // Update the assistant message with final content
                setMessages(prev => {
                  const updated = [...prev]
                  updated[assistantMessageIndex] = {
                    role: 'assistant',
                    content: `Generated email template with subject: "${accumulatedSubject}"`,
                    timestamp: new Date(),
                  }
                  return updated
                })
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating email:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error generating the email. Please try again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSaveTemplate = () => {
    if (onSave) {
      onSave({
        subject: currentSubject,
        html: currentHtml,
        conversationHistory: messages,
      })
    }
  }

  const suggestedPrompts = [
    'Make the header more colorful',
    'Add recipient name personalization',
    'Include workspace logo',
    'Make it more professional',
    'Add a bold call-to-action button',
  ]

  return (
    <div className="space-y-4">
      {/* Conversation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Conversation</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHtmlEditor(!showHtmlEditor)}
              >
                <Code className="h-4 w-4 mr-1" />
                {showHtmlEditor ? 'Hide' : 'View'} HTML
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTemplate}
                disabled={!currentHtml}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Template
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Chat with AI to create or refine your email template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Start a conversation to generate an email template</p>
                <p className="text-sm">
                  Try: "Create a professional invitation email for a challenge"
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-3 items-start',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="shrink-0 mt-1">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="shrink-0 mt-1">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3 items-start">
                <div className="shrink-0 mt-1">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <p className="text-sm">Generating email template...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="mt-4 space-y-3">
            {/* Suggested Prompts */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Suggestions:</span>
                {suggestedPrompts.map((prompt, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </Badge>
                ))}
              </div>
            )}

            {/* Input Field */}
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message or use suggestions..."
                className="min-h-[60px] resize-none"
                disabled={isGenerating}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                className="shrink-0"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </CardContent>
      </Card>

      {/* HTML Editor (conditional) */}
      {showHtmlEditor && currentHtml && (
        <Card>
          <CardHeader>
            <CardTitle>HTML Source</CardTitle>
            <CardDescription>
              You can edit the HTML directly if needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={currentHtml}
              onChange={(e) => setCurrentHtml(e.target.value)}
              className="font-mono text-xs min-h-[300px]"
              placeholder="HTML will appear here..."
            />
          </CardContent>
        </Card>
      )}

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            Email preview updates as AI generates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailPreview
            html={currentHtml}
            subject={currentSubject}
            workspaceName={workspaceName}
            workspaceSlug={workspaceSlug}
          />
        </CardContent>
      </Card>
    </div>
  )
}
