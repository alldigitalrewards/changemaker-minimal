import nodemailer from 'nodemailer'

export function getTransport() {
  const host = process.env.SMTP_HOST || 'smtp.resend.com'
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const secure = port === 465
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP configuration missing')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    pool: true
  })
}

export async function sendInviteEmail(params: {
  to: string
  subject: string
  html: string
}) {
  const fromName = process.env.EMAIL_FROM_NAME || 'Changemaker'
  const fromEmail = process.env.EMAIL_FROM || 'team@updates.changemaker.im'
  const transporter = getTransport()
  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })
}


