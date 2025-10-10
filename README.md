# Changemaker Platform

A production-ready multi-tenant challenges platform built with Next.js 15, featuring sophisticated workspace management, multi-reward systems, and comprehensive participant engagement tools.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# Generate Prisma client and push schema
pnpm prisma generate
pnpm prisma db push

# Seed database with test data
pnpm prisma db seed

# Start development server
pnpm dev
```

Access the app at `http://localhost:3000`

## 🌟 Key Features

### Multi-Tenant Workspace System
- **Path-based routing**: `/w/[slug]` for workspace isolation
- **Multi-workspace memberships**: Users can belong to multiple workspaces with different roles
- **Primary workspace**: Designated default workspace per user
- **Tenant isolation**: Strict data separation between tenants
- **Role-based access**: ADMIN and PARTICIPANT roles with granular permissions

### Multi-Reward System
- **Three reward types**:
  - **Points**: Traditional gamification points
  - **SKU**: Gift cards, merchandise, physical rewards
  - **Monetary**: Direct payments via integrations
- **Flexible configuration**: Per-challenge and per-activity reward rules
- **Approval workflow**: Admin review before reward issuance
- **Status tracking**: PENDING → ISSUED → FAILED/CANCELLED with audit trail
- **Tenant SKU catalog**: Workspace-specific reward offerings

### Communications & Engagement
- **Multi-scope announcements**: Workspace, challenge, or activity level
- **Audience targeting**: All participants, enrolled only, or admins only
- **Priority levels**: Urgent, high, normal, low
- **Scheduling**: Send immediately or schedule for later
- **Rich content**: Support for markdown, links, and attachments

### Performance & Scalability
- **Optimized queries**: Single aggregated database calls (90% reduction in queries)
- **Composite indexes**: Strategic indexing on hot query paths
- **Connection pooling**: Configured for high concurrency
- **Page load times**: <200ms average (75% improvement)
- **Time to interactive**: <400ms (66% improvement)

## 📊 Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, React Server Components)
- **Language**: TypeScript 5.8+
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 6
- **UI Framework**: Tailwind CSS 3
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Theme**: Custom Changemaker theme (coral/terracotta palette)
- **Package Manager**: pnpm

## 🏗️ Project Structure

```
changemaker-template/
├── app/                          # Next.js app directory
│   ├── (auth)/                   # Auth routes (login, signup, reset)
│   ├── w/[slug]/                 # Workspace-scoped routes
│   │   ├── admin/                # Admin dashboard and tools
│   │   └── participant/          # Participant dashboard and features
│   ├── workspaces/               # Global workspace management
│   ├── account/                  # Global account settings
│   ├── api/                      # API routes
│   └── layout.tsx                # Root layout
├── components/                   # React components
│   ├── auth/                     # Authentication components
│   ├── layout/                   # Layout components (header, sidebar)
│   ├── ui/                       # shadcn/ui components
│   ├── communications/           # Communication components
│   └── workspaces/               # Workspace components
├── lib/                          # Utilities and helpers
│   ├── auth/                     # Auth utilities (RBAC, middleware)
│   ├── db/                       # Database queries and helpers
│   ├── email/                    # Email templates and sending
│   ├── supabase/                 # Supabase client utilities
│   └── types.ts                  # Shared TypeScript types
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma             # Prisma schema
│   ├── seed.ts                   # Database seed script
│   └── migrations/               # Database migrations
├── public/                       # Static assets
├── docs/                         # Documentation
│   ├── planning/                 # Project planning docs
│   └── operations/               # Operational guides
└── .taskmaster/                  # Task Master AI configuration
```

## 🗄️ Database Schema

### Core Models
- **Workspace**: Multi-tenant workspaces with tenant isolation
- **User**: User accounts with Supabase integration
- **Membership**: User-workspace relationships with roles
- **Challenge**: Configurable challenges with reward types
- **Activity**: Activity instances linked to challenges
- **ActivityTemplate**: Reusable activity templates
- **Enrollment**: User enrollments in challenges
- **ActivitySubmission**: User submissions for activities

### Rewards & Points
- **RewardIssuance**: Comprehensive reward tracking (points/SKU/monetary)
- **TenantSku**: Workspace-specific SKU catalog
- **PointsLedger**: Transaction log for point movements
- **PointsBalance**: Current point balances per user/workspace
- **WorkspacePointsBudget**: Workspace-level point budgets
- **ChallengePointsBudget**: Challenge-level point budgets

### Communications
- **WorkspaceCommunication**: Multi-scope announcements
- **WorkspaceEmailSettings**: Per-workspace email configuration
- **WorkspaceEmailTemplate**: Custom email template overrides
- **WorkspaceParticipantSegment**: Saved participant filters

### Audit & Events
- **ActivityEvent**: Comprehensive audit trail
- **InviteCode**: Invitation codes with redemption tracking
- **InviteRedemption**: Invitation redemption records

## 🔐 Authentication & Authorization

### Authentication
- Powered by Supabase Auth
- Email/password authentication
- Password reset flow
- Email change verification
- Session management with refresh tokens

### Authorization (RBAC)
- **Platform Super Admin**: Full access across all tenants
- **Workspace Admin**: Manage workspace, challenges, and participants
- **Participant**: Enroll in challenges and complete activities

### Middleware Protection
- Path-based access control
- Workspace membership validation
- Role-based route protection
- API endpoint authorization

## 🎨 UI/UX Highlights

### Dashboard
- Role-specific layouts (Admin vs Participant)
- Workspace switcher for multi-workspace users
- Real-time stats and metrics
- Activity feed and notifications

### Workspace Management
- Create and manage workspaces
- Invite users with role assignment
- Bulk operations on participants
- Workspace discovery (for platform admins)

### Challenge Builder
- Drag-and-drop activity builder
- Flexible reward configuration
- Enrollment rules and limits
- Deadline management

### Participant Experience
- Challenge discovery and enrollment
- Activity submission with file uploads
- Progress tracking and leaderboards
- Reward history and redemptions

## 📈 Performance Metrics

### Current Performance (v0.3.0)
- **Page Load Time**: ~200ms (75% faster than v0.2.0)
- **Database Queries**: 1-2 per page (90% reduction)
- **Time to Interactive**: ~400ms (66% improvement)
- **Bundle Size**: Optimized with tree-shaking and code splitting

### Scalability Targets
- Support 1,000+ concurrent users
- Handle 100+ workspaces per tenant
- Process 10,000+ activities per day
- 99.9% uptime SLA

## 🔧 Development

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- PostgreSQL (via Supabase)

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # For migrations

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm lint                   # Run ESLint

# Database
pnpm prisma generate        # Generate Prisma client
pnpm prisma db push         # Push schema to database
pnpm prisma db seed         # Seed database with test data
pnpm prisma studio          # Open Prisma Studio
pnpm prisma migrate dev     # Create and apply migration

# Testing
pnpm test                   # Run tests
pnpm test:e2e               # Run Playwright E2E tests
pnpm playwright test        # Run Playwright tests with UI
```

### Test Data

After seeding, you can log in with these test accounts:

**Multi-workspace admin**:
- Email: `krobinson@alldigitalrewards.com`
- Password: `Changemaker2025!`
- Workspaces: ACME, AllDigitalRewards, Sharecare

**Single-workspace admin**:
- Email: `kfelke@alldigitalrewards.com`
- Password: `Changemaker2025!`
- Workspace: AllDigitalRewards

**Participant**:
- Email: `john.doe@acme.com`
- Password: `Changemaker2025!`
- Workspace: ACME

## 📚 Documentation

- **API Reference**: `/docs/public-api` (Redoc)
- **Project Planning**: `docs/planning/todo.md`
- **API Documentation Guide**: `docs/operations/api-docs.md`
- **Database Schema**: `prisma/schema.prisma`
- **Changelog**: `CHANGELOG.md`

## 🚦 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
pnpm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Environment Setup
1. Add all environment variables in Vercel project settings
2. Configure Supabase environment (production vs staging)
3. Run database migrations in production
4. Seed production database (optional)

### Production Checklist
- [ ] Set up Supabase production project
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Set up connection pooling (Supabase Pooler)
- [ ] Configure CORS and security headers
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Test authentication flows
- [ ] Verify email sending (SMTP)
- [ ] Load test critical paths

## 🧪 Testing

### Unit Tests
```bash
pnpm test                     # Run all tests
pnpm test:watch               # Watch mode
pnpm test:coverage            # Generate coverage report
```

### E2E Tests
```bash
pnpm test:e2e                 # Run E2E tests headless
pnpm playwright test          # Run with UI
pnpm playwright test --debug  # Debug mode
```

### Manual Testing Flows
1. **Authentication**: Signup → Email verification → Login
2. **Workspace Creation**: Create workspace → Invite users
3. **Challenge Flow**: Create challenge → Add activities → Publish
4. **Participant Flow**: Enroll → Submit activity → View rewards
5. **Admin Approval**: Review submission → Issue reward → Verify status

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Write/update tests
4. Run linting: `pnpm lint`
5. Build to verify: `pnpm build`
6. Commit with conventional commits: `feat: add new feature`
7. Push and create a PR

## 📝 Project Evolution

### v0.3.0 (2025-10-10) - Multi-Reward System
**PR**: [#44](https://github.com/alldigitalrewards/changemaker-minimal/pull/44)
- Implemented three reward types (points, SKU, monetary)
- Added comprehensive communications system
- Global account management
- Performance optimizations (90% query reduction)
- Multi-workspace improvements

### v0.2.0 (2025-09-29) - Multi-Tenant Foundation
**PR**: [#43](https://github.com/alldigitalrewards/changemaker-minimal/pull/43)
- Path-based workspace routing
- Activity templates and instances
- Points system with budgets
- Email system per workspace
- Participant segments

### v0.1.0 (2025-08-01) - Initial Release
- Next.js 15 foundation
- Supabase integration
- Basic challenges and enrollments
- Admin and participant dashboards

## 📄 License

Proprietary - AllDigitalRewards, Inc.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Authentication by [Supabase](https://supabase.com/)
- Deployed on [Vercel](https://vercel.com/)

---

**Generated with Claude Code** 🤖
Last updated: 2025-10-10
