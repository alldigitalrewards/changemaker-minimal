import { getUserDisplayName } from '@/lib/user-utils'

export function renderWelcomeEmail(args: {
  userFirstName?: string | null
  userLastName?: string | null
  userDisplayName?: string | null
  userEmail: string
  workspaceName: string
  workspaceSlug: string
  dashboardUrl: string
  role: string
}) {
  const userName = args.userFirstName || getUserDisplayName({
    email: args.userEmail,
    firstName: args.userFirstName || null,
    lastName: args.userLastName || null,
    displayName: args.userDisplayName || null,
  })

  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; color:#111; max-width:600px; margin:0 auto">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0">
      <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 700">Welcome to ${args.workspaceName}! 🎉</h1>
    </div>

    <!-- Body -->
    <div style="background: #fff; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px">
      <p style="font-size: 16px; margin: 0 0 16px">Hi ${userName},</p>

      <p style="font-size: 16px; margin: 0 0 24px">
        Welcome to <strong>${args.workspaceName}</strong>! We're excited to have you join us as a <strong>${args.role}</strong>.
        Your account has been successfully created and you're ready to get started.
      </p>

      <!-- Quick Start Guide -->
      <div style="background: #f9fafb; border-left: 4px solid #ef4444; padding: 20px; margin: 24px 0; border-radius: 4px">
        <h3 style="margin: 0 0 16px; color: #111; font-size: 18px">🚀 Quick Start Guide</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151">
          <li style="margin-bottom: 8px"><strong>Complete your profile</strong> - Add a photo and bio to personalize your account</li>
          <li style="margin-bottom: 8px"><strong>Browse challenges</strong> - Explore available challenges and join the ones that interest you</li>
          <li style="margin-bottom: 8px"><strong>Earn rewards</strong> - Complete challenges to earn points and redeem exciting rewards</li>
          <li style="margin-bottom: 0"><strong>Track progress</strong> - Monitor your achievements and see how you rank on the leaderboard</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0">
        <a href="${args.dashboardUrl}"
           style="display: inline-block;
                  padding: 14px 32px;
                  background: #ef4444;
                  color: #fff;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 16px;
                  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3)">
          Go to Dashboard →
        </a>
      </div>

      <!-- What to Expect -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px">
        <h3 style="margin: 0 0 16px; color: #111; font-size: 18px">What to Expect</h3>
        <div style="display: grid; gap: 16px">
          <div style="display: flex; gap: 12px">
            <span style="font-size: 24px">✓</span>
            <div>
              <strong style="display: block; color: #111; margin-bottom: 4px">Engaging Challenges</strong>
              <span style="color: #6b7280; font-size: 14px">Participate in meaningful challenges that make a real impact</span>
            </div>
          </div>
          <div style="display: flex; gap: 12px">
            <span style="font-size: 24px">🎁</span>
            <div>
              <strong style="display: block; color: #111; margin-bottom: 4px">Exciting Rewards</strong>
              <span style="color: #6b7280; font-size: 14px">Earn points and redeem them for rewards that matter to you</span>
            </div>
          </div>
          <div style="display: flex; gap: 12px">
            <span style="font-size: 24px">📊</span>
            <div>
              <strong style="display: block; color: #111; margin-bottom: 4px">Progress Tracking</strong>
              <span style="color: #6b7280; font-size: 14px">See your achievements and track your journey to success</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Support -->
      <div style="background: #eff6ff; border: 1px solid #dbeafe; padding: 16px; margin: 24px 0; border-radius: 6px">
        <p style="margin: 0; color: #1e40af; font-size: 14px">
          <strong>Need help getting started?</strong><br>
          Our support team is here to help! Reply to this email or visit your workspace dashboard for resources and assistance.
        </p>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0">
        Best regards,<br>
        <strong style="color: #111">The ${args.workspaceName} Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px">
      <p style="margin: 0 0 8px">
        This email was sent to ${args.userEmail}
      </p>
      <p style="margin: 0">
        © ${new Date().getFullYear()} ${args.workspaceName}. All rights reserved.
      </p>
    </div>
  </div>
  `
}
