/**
 * Resend HTTP API Email Sender
 *
 * This bypasses SMTP and DNS requirements, using Resend's HTTP API directly.
 * Works immediately without DNS verification - perfect for testing.
 *
 * Setup: Add RESEND_API_KEY to your .env.local
 * Get your API key from: https://resend.com/api-keys
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: {
    name: string
    email: string
  }
}

export async function sendEmailViaResendAPI(params: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured in environment')
  }

  const fromName = params.from?.name || process.env.EMAIL_FROM_NAME || 'Changemaker'
  const fromEmail = params.from?.email || process.env.EMAIL_FROM || 'team@changemaker.im'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Resend API error: ${error.message || response.statusText}`)
  }

  const data = await response.json()
  return data
}

/**
 * Development fallback - logs email to console instead of sending
 * Useful when no email service is configured
 */
export function logEmailToConsole(params: SendEmailParams) {
  console.log('\n📧 EMAIL (Development Mode - Not Sent)\n')
  console.log('To:', params.to)
  console.log('Subject:', params.subject)
  console.log('From:', params.from ? `${params.from.name} <${params.from.email}>` : 'Default sender')
  console.log('\nHTML Body:')
  console.log('─'.repeat(80))
  console.log(params.html.substring(0, 500) + (params.html.length > 500 ? '...' : ''))
  console.log('─'.repeat(80))
  console.log('\n')

  return {
    id: `console-${Date.now()}`,
    message: 'Email logged to console (development mode)',
  }
}

/**
 * Smart email sender - tries multiple methods in order:
 * 1. Resend HTTP API (if RESEND_API_KEY is set)
 * 2. SMTP (if SMTP credentials are configured)
 * 3. Console log (development fallback)
 */
export async function sendEmail(params: SendEmailParams) {
  // Try Resend HTTP API first (works without DNS)
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendEmailViaResendAPI(params)
    } catch (error) {
      console.error('Resend API failed:', error)
      // Fall through to next method
    }
  }

  // Try SMTP if configured
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const { getTransport } = await import('./smtp')
      const transporter = getTransport()

      const fromName = params.from?.name || process.env.EMAIL_FROM_NAME || 'Changemaker'
      const fromEmail = params.from?.email || process.env.EMAIL_FROM || 'team@updates.changemaker.im'

      await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      })

      return { id: 'smtp-sent', message: 'Email sent via SMTP' }
    } catch (error) {
      console.error('SMTP failed:', error)
      // Fall through to console log
    }
  }

  // Development fallback - log to console
  if (process.env.NODE_ENV === 'development') {
    return logEmailToConsole(params)
  }

  throw new Error(
    'No email service configured. Please set either RESEND_API_KEY or SMTP credentials (SMTP_USER, SMTP_PASS)'
  )
}
