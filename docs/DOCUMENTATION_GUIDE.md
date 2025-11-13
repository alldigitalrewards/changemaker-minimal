# Documentation Guide

## Overview

Changemaker uses a custom MDX-based documentation system with two types of docs:

1. **Public Docs** (`/content/docs/`) - Accessible to everyone
2. **Workspace Docs** (`/content/workspace-docs/`) - Role-based access within workspaces

## File Structure

```
content/
├── docs/                        # Public documentation
│   ├── index.mdx               # Homepage (required)
│   ├── getting-started/
│   │   └── index.mdx
│   ├── api-reference/
│   │   └── index.mdx
│   └── faq/
│       └── index.mdx
└── workspace-docs/              # Role-restricted documentation
    ├── admin/
    │   ├── challenges.mdx
    │   ├── workspace-settings.mdx
    │   └── rewards.mdx
    └── participant/
        ├── enrollment.mdx
        └── dashboard.mdx
```

## Creating a New Document

### 1. Create the MDX File

Create a `.mdx` file in the appropriate directory:

```mdx
---
title: Your Document Title
description: Brief description for SEO and previews
order: 1
tags: ['tag1', 'tag2', 'tag3']
roles: ['ADMIN', 'PARTICIPANT']  # Only for workspace docs
author: Your Name
date: 2025-01-10
---

# Your Document Title

Write your content using Markdown...

## Section 1

Content here...

### Subsection

More content...

## Section 2

You can use:
- Lists
- **Bold text**
- *Italic text*
- `inline code`
- [Links](/docs/other-page)
- Images
- Code blocks
- Tables
- And more!
```

### 2. Frontmatter Fields

**Required:**
- `title`: Document title (used in navigation and page header)
- `description`: Short description

**Optional:**
- `order`: Controls navigation order (lower numbers appear first)
- `tags`: Array of tags for categorization
- `roles`: Array of roles that can access this doc (workspace docs only)
  - Options: `ADMIN`, `PARTICIPANT`, `MANAGER`
- `author`: Author name
- `date`: Publication date (YYYY-MM-DD format)

### 3. Markdown Features

#### Headings

```markdown
# H1 Heading
## H2 Heading
### H3 Heading
#### H4 Heading
```

#### Lists

```markdown
- Unordered list item
- Another item
  - Nested item

1. Ordered list item
2. Another item
   1. Nested item
```

#### Code

Inline code: \`const foo = 'bar'\`

Code blocks:
\`\`\`typescript
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

#### Links

```markdown
[Internal link](/docs/getting-started)
[External link](https://example.com)
```

#### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

#### Blockquotes

```markdown
> This is a blockquote
> spanning multiple lines
```

#### Images

```markdown
![Alt text](/images/screenshot.png)
```

## Navigation Generation

Navigation is automatically generated based on:
1. File structure (folders create hierarchy)
2. `order` field in frontmatter (controls ordering)
3. `title` field in frontmatter (used as nav label)

Example structure:
```
docs/
├── index.mdx           (order: 0) → "Welcome to Changemaker"
├── getting-started/
│   └── index.mdx       (order: 1) → "Getting Started"
└── api-reference/
    └── index.mdx       (order: 2) → "API Reference"
```

Results in navigation:
```
- Welcome to Changemaker
- Getting Started
- API Reference
```

## Table of Contents

Table of contents is automatically generated from headings (H2 and H3) in your document.

## Best Practices

### 1. Use Descriptive Titles

❌ Bad: `docs.mdx`
✅ Good: `challenge-management.mdx`

### 2. Organize by Topic

```
docs/
└── guides/
    ├── challenges/
    │   ├── creating-challenges.mdx
    │   ├── managing-challenges.mdx
    │   └── challenge-templates.mdx
    └── participants/
        ├── inviting-participants.mdx
        └── tracking-progress.mdx
```

### 3. Use Clear Headings

```markdown
## Clear and Descriptive Section Title

Not just "Overview" or "Details"
```

### 4. Include Code Examples

```typescript
// Good: Include working code examples
import { createChallenge } from '@/lib/challenges';

const challenge = await createChallenge({
  title: 'Innovation Challenge 2025',
  description: 'Submit your best ideas',
});
```

### 5. Add Tags for Searchability

```yaml
---
tags: ['admin', 'challenges', 'guide', 'tutorial']
---
```

## Styling

Documents are automatically styled using custom MDX components with the Changemaker theme:

- **Headings**: Coral accents, proper hierarchy
- **Links**: Coral color with hover effects
- **Code**: Syntax highlighting with dark theme
- **Tables**: Striped rows, proper borders
- **Blockquotes**: Coral left border, light background

## Testing Your Docs

1. Save your `.mdx` file
2. Visit `/docs` in your browser
3. Navigation should automatically include your new doc
4. Click to view and verify rendering

## Recommended Docs to Create

### Public Docs (`/content/docs/`)

- [x] index.mdx - Welcome page
- [x] getting-started/index.mdx - Onboarding guide
- [x] api-reference/index.mdx - API documentation
- [x] faq/index.mdx - Common questions
- [ ] guides/challenges.mdx - Challenge management
- [ ] guides/participants.mdx - Participant management
- [ ] guides/rewards.mdx - Reward distribution
- [ ] integrations/rewardstack.mdx - RewardStack setup
- [ ] integrations/webhooks.mdx - Webhook configuration
- [ ] troubleshooting/index.mdx - Common issues

### Workspace Docs (`/content/workspace-docs/`)

#### Admin Docs
- [x] admin/challenges.mdx - Admin challenge guide
- [ ] admin/workspace-settings.mdx - Workspace configuration
- [ ] admin/user-management.mdx - Managing team members
- [ ] admin/rewards.mdx - Reward configuration
- [ ] admin/analytics.mdx - Analytics and reporting
- [ ] admin/branding.mdx - Custom branding setup

#### Participant Docs
- [x] participant/enrollment.mdx - How to join challenges
- [ ] participant/dashboard.mdx - Dashboard overview
- [ ] participant/submissions.mdx - Submitting work
- [ ] participant/rewards.mdx - Claiming rewards

## Need Help?

Check the documentation system code:
- `lib/docs/loader.ts` - MDX loading and compilation
- `lib/docs/mdx-renderer.tsx` - Client-side rendering
- `lib/docs/mdx-components.tsx` - Custom styled components
- `lib/docs/sources.ts` - Doc source management
- `app/docs/[[...slug]]/page.tsx` - Public docs route
- `app/w/[slug]/docs/[[...slug]]/page.tsx` - Workspace docs route (when implemented)
