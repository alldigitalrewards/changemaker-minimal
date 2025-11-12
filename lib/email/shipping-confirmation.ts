import { prisma } from '@/lib/prisma'
import { sendInviteEmail } from './smtp'
import { renderShippingConfirmationEmail } from './templates/shipping-confirmation'
import { generateConfirmationToken } from '@/lib/auth/tokens'
import { escapeHtml, sanitizeFullName, sanitizeDisplayName } from '@/lib/utils/security'

export async function sendShippingConfirmationEmail(params: {
  rewardIssuanceId: string
  workspaceSlug: string
}) {
  // Fetch reward issuance with user and SKU details
  const rewardIssuance = await prisma.rewardIssuance.findUnique({
    where: { id: params.rewardIssuanceId },
    include: {
      User: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
        },
      },
      Workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  if (!rewardIssuance) {
    throw new Error('Reward issuance not found')
  }

  if (rewardIssuance.type !== 'sku' || !rewardIssuance.skuId) {
    throw new Error('Reward is not a SKU reward')
  }

  // Check if SKU requires shipping
  const sku = await prisma.workspaceSku.findFirst({
    where: {
      workspaceId: rewardIssuance.workspaceId,
      skuId: rewardIssuance.skuId,
    },
  })

  if (!sku?.requiresShipping) {
    throw new Error('SKU does not require shipping')
  }

  const user = rewardIssuance.User
  if (!user.email) {
    throw new Error('User email not found')
  }

  // Check if user has complete address
  if (
    !user.addressLine1 ||
    !user.city ||
    !user.state ||
    !user.zipCode ||
    !user.country
  ) {
    throw new Error('User address is incomplete. Please update profile first.')
  }

  // Sanitize user data to prevent XSS attacks
  const recipientName =
    sanitizeDisplayName(user.displayName) ||
    sanitizeFullName(user.firstName, user.lastName) ||
    escapeHtml(user.email.split('@')[0])

  // Generate secure confirmation token (24 hour expiry)
  const token = await generateConfirmationToken({
    rewardIssuanceId: params.rewardIssuanceId,
    userId: user.id,
    workspaceId: rewardIssuance.workspaceId,
  })

  // Use URL API for safe URL construction
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const confirmUrl = new URL(
    `/api/workspaces/${params.workspaceSlug}/rewards/${params.rewardIssuanceId}/confirm-shipping`,
    baseUrl
  )
  confirmUrl.searchParams.set('token', token)

  const updateUrl = new URL(
    `/w/${params.workspaceSlug}/participant/profile`,
    baseUrl
  )
  updateUrl.searchParams.set('update', 'address')

  const html = renderShippingConfirmationEmail({
    recipientName,
    workspaceName: escapeHtml(rewardIssuance.Workspace.name),
    skuName: escapeHtml(sku.name),
    skuDescription: sku.description ? escapeHtml(sku.description) : undefined,
    currentAddress: {
      addressLine1: escapeHtml(user.addressLine1),
      addressLine2: user.addressLine2 ? escapeHtml(user.addressLine2) : undefined,
      city: escapeHtml(user.city),
      state: escapeHtml(user.state),
      postalCode: escapeHtml(user.zipCode),
      country: escapeHtml(user.country),
    },
    confirmUrl: confirmUrl.toString(),
    updateUrl: updateUrl.toString(),
  })

  // Idempotency check: prevent duplicate emails
  if (rewardIssuance.shippingAddressConfirmationEmailSent) {
    return {
      success: true,
      emailSent: false,
      alreadySent: true,
    }
  }

  try {
    // Send email first (cannot be rolled back)
    await sendInviteEmail({
      to: user.email,
      subject: `Confirm Shipping Address for ${sku.name}`,
      html,
    })

    // Update database only after successful email send (idempotent)
    // Using transaction ensures atomicity of the update
    await prisma.$transaction(async (tx) => {
      // Double-check email hasn't been sent by concurrent request
      const current = await tx.rewardIssuance.findUnique({
        where: { id: params.rewardIssuanceId },
        select: { shippingAddressConfirmationEmailSent: true },
      })

      if (current?.shippingAddressConfirmationEmailSent) {
        // Email was already sent by concurrent request - don't send again
        return
      }

      await tx.rewardIssuance.update({
        where: { id: params.rewardIssuanceId },
        data: {
          shippingAddressConfirmationEmailSent: true,
          shippingAddressConfirmationEmailSentAt: new Date(),
        },
      })
    })

    return {
      success: true,
      emailSent: true,
    }
  } catch (error) {
    // Email sending failed - database state remains unchanged
    console.error('Failed to send shipping confirmation email:', error)
    throw new Error('Failed to send confirmation email')
  }
}
