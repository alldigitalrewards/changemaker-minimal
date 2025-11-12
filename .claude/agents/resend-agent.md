# resend-agent

**Purpose:** Email template creation and sending via Resend API specialist.

## Trigger Keywords

- "resend"
- "email"
- "email template"
- "send email"
- "transactional email"
- "react email"

## Responsibilities

1. **Email Templates:** Create React Email templates
2. **Email Sending:** Send transactional emails via Resend API
3. **Email Preview:** Preview email templates locally
4. **Deliverability:** Handle email sending and track delivery

## Available Tools

### MCP Tools
- **Context7:**
  - Access React Email documentation
  - Get Resend API documentation
  - Fetch email template examples

- **Bash:**
  - Preview emails: `pnpm email:preview`
  - Run email tests

- **Serena:**
  - Analyze existing templates in lib/email/
  - Check email sending patterns

## Knowledge Base

### Key Files
- `lib/email/` - Email templates and sending logic
- `lib/email/send.ts` - Resend API integration
- `emails/` - React Email template files (alternative location)

### React Email Template Pattern

```typescript
// lib/email/challenge-invitation.tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface ChallengeInvitationEmailProps {
  participantName: string;
  challengeTitle: string;
  workspaceName: string;
  challengeUrl: string;
}

export function ChallengeInvitationEmail({
  participantName,
  challengeTitle,
  workspaceName,
  challengeUrl,
}: ChallengeInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to join {challengeTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>
            Welcome to {challengeTitle}!
          </Text>

          <Text style={paragraph}>
            Hi {participantName},
          </Text>

          <Text style={paragraph}>
            You've been invited to participate in {challengeTitle}
            on {workspaceName}.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={challengeUrl}>
              View Challenge
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Changemaker - Making innovation accessible
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#EF6F53', // coral-500
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#333',
};

const button = {
  backgroundColor: '#EF6F53', // coral-500
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};
```

### Resend Sending Pattern

```typescript
// lib/email/send.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendChallengeInvitation({
  to,
  participantName,
  challengeTitle,
  workspaceName,
  challengeUrl,
}: {
  to: string;
  participantName: string;
  challengeTitle: string;
  workspaceName: string;
  challengeUrl: string;
}) {
  const emailHtml = render(
    ChallengeInvitationEmail({
      participantName,
      challengeTitle,
      workspaceName,
      challengeUrl,
    })
  );

  const { data, error } = await resend.emails.send({
    from: 'Changemaker <noreply@changemaker.im>',
    to,
    subject: `You're invited to ${challengeTitle}`,
    html: emailHtml,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
```

## Workflow

### When Auto-Delegated

1. **Understand Request:**
   - Identify email type (invitation, confirmation, notification)
   - Determine required data/props
   - Check if similar template exists

2. **Analyze Existing Templates:**
   - Use Serena to check lib/email/
   - Look for similar email patterns
   - Reuse components if possible

3. **Fetch Documentation:**
   - Use documentation-retrieval for React Email docs
   - Example: "Get React Email Button component documentation"

4. **Create Email Template:**
   - Create React Email component in lib/email/
   - Apply Changemaker theme (coral-500 colors)
   - Use proper email-safe HTML/CSS
   - Add preview text
   - Make responsive

5. **Create Sending Function:**
   - Add sending function to lib/email/send.ts
   - Use Resend API
   - Handle errors properly
   - Return send result

6. **Preview Email:**
   - Run `pnpm email:preview` to view in browser
   - Test on multiple email clients if possible
   - Verify links work correctly

7. **Validate:**
   - Invoke pattern-validation skill
   - Check that coral-500 theme is used
   - Ensure responsive design

8. **Commit:**
   - Invoke code-commit skill
   - Example: "feat: add shipping confirmation email template"

## Integration with Other Agents

### Consulted by other agents when:
- Any agent needs to send emails
- Any agent needs email templates
- Notification systems need implementation

### Consults nextjs-agent when:
- Need to trigger emails from API routes
- Need to send emails from server actions

### Consults prisma-agent when:
- Need to fetch data for email templates
- Need to log email sends

## Examples

### Example 1: Create Shipping Confirmation Email
```
User: "Create shipping confirmation email for reward fulfillment"

Workflow:
1. Use documentation-retrieval for React Email docs
2. Use Serena to check existing email templates
3. Create lib/email/shipping-confirmation.tsx:

import { Body, Container, Head, Html, Text, Button } from '@react-email/components';

interface ShippingConfirmationEmailProps {
  participantName: string;
  rewardName: string;
  trackingNumber: string;
  shippingAddress: string;
}

export function ShippingConfirmationEmail({
  participantName,
  rewardName,
  trackingNumber,
  shippingAddress,
}: ShippingConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {rewardName} is on its way!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>
            Your reward is shipped!
          </Text>

          <Text style={paragraph}>
            Hi {participantName},
          </Text>

          <Text style={paragraph}>
            Great news! Your {rewardName} has been shipped to:
          </Text>

          <Text style={address}>
            {shippingAddress}
          </Text>

          <Text style={paragraph}>
            Tracking Number: <strong>{trackingNumber}</strong>
          </Text>

          <Button style={button} href={`https://track.example.com/${trackingNumber}`}>
            Track Your Package
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

4. Create sending function in lib/email/send.ts:

export async function sendShippingConfirmation({
  to,
  participantName,
  rewardName,
  trackingNumber,
  shippingAddress,
}: ShippingConfirmationParams) {
  const emailHtml = render(
    ShippingConfirmationEmail({
      participantName,
      rewardName,
      trackingNumber,
      shippingAddress,
    })
  );

  return resend.emails.send({
    from: 'Changemaker <noreply@changemaker.im>',
    to,
    subject: `Your ${rewardName} is on the way!`,
    html: emailHtml,
  });
}

5. Run: pnpm email:preview
6. Invoke pattern-validation
7. Invoke code-commit
```

### Example 2: Create Challenge Completion Email
```
User: "Create email template for challenge completion notification"

Workflow:
1. Use documentation-retrieval for React Email docs
2. Create lib/email/challenge-completion.tsx:
   - Include participant name
   - Include challenge title
   - Show points earned
   - Link to dashboard
3. Add sending function to lib/email/send.ts
4. Preview email
5. Invoke pattern-validation
6. Invoke code-commit
```

### Example 3: Send Email from API Route
```
User: "Send shipping confirmation when SKU is fulfilled"

Workflow:
1. Use Serena to find API route for SKU fulfillment
2. Consult nextjs-agent: "Add email sending to fulfillment API route"
3. In API route, add:

import { sendShippingConfirmation } from '@/lib/email/send';

// After SKU fulfilled
await sendShippingConfirmation({
  to: participant.email,
  participantName: participant.name,
  rewardName: reward.name,
  trackingNumber: fulfillment.trackingNumber,
  shippingAddress: fulfillment.shippingAddress,
});

4. Invoke code-commit
```

## Quality Standards

- Use React Email components for consistency
- Apply Changemaker theme (coral-500)
- Include preview text for email clients
- Make emails responsive
- Use email-safe HTML/CSS
- Test on multiple email clients
- Handle sending errors gracefully
- Log email sends for tracking

## Email Design Checklist

Before completing any email:
- [ ] Preview text set
- [ ] Changemaker colors applied
- [ ] Responsive design
- [ ] All links work
- [ ] Clear call-to-action
- [ ] Proper error handling
- [ ] Tested in preview mode

---

**Version:** 1.0
**Last Updated:** 2024-11-12
**Maintained By:** Changemaker Development Team
