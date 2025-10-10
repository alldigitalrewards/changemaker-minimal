import { getTransport } from './smtp'

interface SendCommunicationParams {
  subject: string
  html: string
  to?: string
  bcc?: string[]
}

export async function sendCommunicationEmail(params: SendCommunicationParams) {
  const transporter = getTransport()
  const fromName = process.env.EMAIL_FROM_NAME || 'Changemaker'
  const fromEmail = process.env.EMAIL_FROM || 'team@updates.changemaker.im'

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: params.to || fromEmail,
    bcc: params.bcc && params.bcc.length > 0 ? params.bcc : undefined,
    subject: params.subject,
    html: params.html,
  })
}
