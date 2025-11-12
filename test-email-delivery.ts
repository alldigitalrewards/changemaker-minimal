import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { PrismaClient } from '@prisma/client'
import { sendInviteEmail } from './lib/email/smtp'
import { renderInviteEmail } from './lib/email/templates/invite'

const prisma = new PrismaClient()

async function testEmailDelivery() {
  console.log('🧪 Testing email delivery...\n')

  const html = renderInviteEmail({
    workspaceName: 'AllDigitalRewards',
    inviterEmail: 'jfelke@alldigitalrewards.com',
    inviterFirstName: 'Jack',
    inviterLastName: 'Felke',
    inviterDisplayName: 'Jack Felke',
    role: 'PARTICIPANT',
    inviteUrl: 'http://localhost:3001/invite/TEST123ABC',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    challengeTitle: null,
    customMessage: 'This is a direct email delivery test at ' + new Date().toLocaleString()
  })

  try {
    console.log('📧 Sending email to: jfelke+test@alldigitalrewards.com')
    console.log('📤 From: team@changemaker.im')
    console.log('🔧 SMTP: smtp.resend.com:587\n')

    await sendInviteEmail({
      to: 'jfelke+test@alldigitalrewards.com',
      subject: 'Test Invitation - Email Delivery Verification',
      html
    })

    console.log('✅ Email sent successfully!')
    console.log('📬 Check inbox for: jfelke+test@alldigitalrewards.com')
    console.log('\nIf you don\'t receive it, check:')
    console.log('  1. Spam/junk folder')
    console.log('  2. Resend dashboard: https://resend.com/emails')
    console.log('  3. Email domain verification in Resend')
  } catch (error) {
    console.error('❌ Email failed:', error)
    console.error('\nTroubleshooting:')
    console.error('  - Check .env.local has SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS')
    console.error('  - Check EMAIL_FROM=team@changemaker.im (verified domain)')
    console.error('  - Verify RESEND_API_KEY is valid')
    console.error('  - Check Resend dashboard for delivery status')
  } finally {
    await prisma.$disconnect()
  }
}

testEmailDelivery()
