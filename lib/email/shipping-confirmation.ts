import { prisma } from '@/lib/prisma'
import { sendInviteEmail } from './smtp'
import { renderShippingConfirmationEmail } from './templates/shipping-confirmation'

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
          postalCode: true,
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
    !user.postalCode ||
    !user.country
  ) {
    throw new Error('User address is incomplete. Please update profile first.')
  }

  const recipientName =
    user.displayName ||
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.email.split('@')[0]

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const confirmUrl = `${baseUrl}/api/workspaces/${params.workspaceSlug}/rewards/${params.rewardIssuanceId}/confirm-shipping`
  const updateUrl = `${baseUrl}/w/${params.workspaceSlug}/participant/profile?update=address`

  const html = renderShippingConfirmationEmail({
    recipientName,
    workspaceName: rewardIssuance.Workspace.name,
    skuName: sku.name,
    skuDescription: sku.description || undefined,
    currentAddress: {
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      city: user.city,
      state: user.state,
      postalCode: user.postalCode,
      country: user.country,
    },
    confirmUrl,
    updateUrl,
  })

  await sendInviteEmail({
    to: user.email,
    subject: `Confirm Shipping Address for ${sku.name}`,
    html,
  })

  // Update reward issuance to track email sent
  await prisma.rewardIssuance.update({
    where: { id: params.rewardIssuanceId },
    data: {
      shippingAddressConfirmationEmailSent: true,
      shippingAddressConfirmationEmailSentAt: new Date(),
    },
  })

  return {
    success: true,
    emailSent: true,
  }
}
