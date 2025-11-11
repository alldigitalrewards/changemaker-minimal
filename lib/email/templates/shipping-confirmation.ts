export function renderShippingConfirmationEmail(args: {
  recipientName: string
  workspaceName: string
  skuName: string
  skuDescription?: string
  currentAddress: {
    addressLine1: string
    addressLine2?: string | null
    city: string
    state: string
    postalCode: string
    country: string
  }
  confirmUrl: string
  updateUrl: string
}) {
  const title = 'Confirm Your Shipping Address'

  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; color:#111; max-width:600px; margin:0 auto">
    <h2 style="margin:0 0 16px; color:#111">${title}</h2>

    <p>Hi ${args.recipientName},</p>

    <p>Congratulations! You've earned a <strong>${args.skuName}</strong> reward from <strong>${args.workspaceName}</strong>.</p>

    ${args.skuDescription ? `<p style="color:#555; font-size:14px">${args.skuDescription}</p>` : ''}

    <div style="background:#f9fafb; border-left:4px solid #ef4444; padding:16px; margin:24px 0">
      <p style="margin:0 0 8px; font-weight:600">Before we can ship your reward, please confirm your shipping address:</p>

      <div style="margin-top:12px; padding:12px; background:white; border-radius:6px">
        <div style="font-size:14px; line-height:1.5">
          ${args.currentAddress.addressLine1}<br>
          ${args.currentAddress.addressLine2 ? `${args.currentAddress.addressLine2}<br>` : ''}
          ${args.currentAddress.city}, ${args.currentAddress.state} ${args.currentAddress.postalCode}<br>
          ${args.currentAddress.country}
        </div>
      </div>
    </div>

    <p style="margin:24px 0">Choose an option below:</p>

    <div style="margin:16px 0">
      <a href="${args.confirmUrl}"
         style="display:inline-block; padding:12px 24px; background:#10b981; color:#fff; border-radius:6px; text-decoration:none; font-weight:600; margin-right:12px">
        ✓ Address is Correct
      </a>

      <a href="${args.updateUrl}"
         style="display:inline-block; padding:12px 24px; background:#6366f1; color:#fff; border-radius:6px; text-decoration:none; font-weight:600">
        Update Address
      </a>
    </div>

    <p style="color:#666; font-size:13px; margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb">
      <strong>Note:</strong> Your reward will not be shipped until you confirm your address.
      If you need to update your address, you can do so in your workspace profile settings.
    </p>

    <p style="color:#999; font-size:12px; margin-top:24px">
      This email was sent to you because you earned a physical reward.
      If you did not request this, please contact your workspace administrator.
    </p>
  </div>
  `
}
