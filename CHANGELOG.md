# Changelog

All notable changes to the Changemaker Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-01-17

### Added
- Task Master integration for project management and feature tracking
- Product Requirements Document (PRD) for Challenge Progression and Rewards System
- 9 main tasks with 40 subtasks for implementing new features:
  - Challenge Progression System with states (submitted, approved, in_development, etc.)
  - Mock Point System with wallet functionality
  - Admin workspace wallets for point distribution
  - Enhanced participant management interface
  - Integration preparation layer for RewardSTACK API
  - Security measures and performance optimizations
- Branch `SandboxNewFeatures` for feature development

### Changed
- Updated Task Master configuration to use Perplexity AI for research-backed task generation
- Refactored task dependencies to reflect existing project state

### Technical Details
- Project uses pnpm for package management
- Deployed to Vercel (changemaker.im for production, preview.changemaker.im for previews)
- Supabase integration (local for development, production deployed)
- Multi-tenant architecture with path-based workspace routing (/w/[slug])

## [0.1.0] - 2025-01-05

### Initial Release
- Next.js 15 application with App Router
- Supabase authentication and database integration
- Prisma ORM with PostgreSQL
- Multi-tenant workspace system
- Challenge and Enrollment models
- Admin and Participant dashboards
- Role-based access control (ADMIN, PARTICIPANT)
- Tailwind CSS with shadcn/ui components
- Changemaker theme (coral/terracotta color scheme)