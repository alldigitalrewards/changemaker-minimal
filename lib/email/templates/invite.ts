import { getUserDisplayName } from '@/lib/user-utils'

export function renderInviteEmail(args: {
  workspaceName: string
  inviterEmail: string
  inviterFirstName?: string | null
  inviterLastName?: string | null
  inviterDisplayName?: string | null
  role: string
  inviteUrl: string
  expiresAt: Date
  challengeTitle?: string | null
}) {
  const expireStr = args.expiresAt.toLocaleString()
  const title = `You're invited to join ${args.workspaceName}`
  const inviterName = getUserDisplayName({
    email: args.inviterEmail,
    firstName: args.inviterFirstName || null,
    lastName: args.inviterLastName || null,
    displayName: args.inviterDisplayName || null,
  })
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; color:#111">
    <h2 style="margin:0 0 12px">${title}</h2>
    <p><strong>${inviterName}</strong> invited you to join <strong>${args.workspaceName}</strong>${args.challengeTitle ? ` for the challenge <strong>${args.challengeTitle}</strong>` : ''} as <strong>${args.role}</strong>.</p>
    <p><a href="${args.inviteUrl}" style="display:inline-block;padding:10px 16px;background:#ef4444;color:#fff;border-radius:6px;text-decoration:none">Accept invitation</a></p>
    <p>Or copy and paste this link:
      <br><a href="${args.inviteUrl}">${args.inviteUrl}</a>
    </p>
    <p style="color:#555;font-size:12px">This invitation expires on ${expireStr}.</p>
  </div>
  `
}


