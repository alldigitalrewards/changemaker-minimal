# Database Seeding Guide

## Overview
This seed script creates a complete test environment with workspaces, users, and challenges.

## What gets created:

### 🏢 Workspaces
- **acme** (ACME Corporation)
- **alldigitalrewards** (AllDigitalRewards)  
- **sharecare** (Sharecare)

### 👤 Admin Users (All from AllDigitalRewards)
- krobinson@alldigitalrewards.com
- kfelke@alldigitalrewards.com
- jfelke@alldigitalrewards.com
- jhoughtelin@alldigitalrewards.com

### 👥 Participant Users
**ACME:**
- john.doe@acme.com
- jane.smith@acme.com
- bob.wilson@acme.com

**AllDigitalRewards:**
- sarah.jones@alldigitalrewards.com
- mike.chen@alldigitalrewards.com
- lisa.taylor@alldigitalrewards.com

**Sharecare:**
- david.brown@sharecare.com
- emma.davis@sharecare.com
- alex.johnson@sharecare.com

### 🔑 Login Credentials
**Password for ALL users:** `Changemaker2025!`

### 🎯 Sample Challenges
Each workspace gets 3-5 challenges:
- Innovation Sprint 2025
- Sustainability Challenge
- Wellness & Wellbeing
- Digital Transformation
- Community Outreach

### 📝 Enrollments
Each participant is automatically enrolled in 1-3 challenges from their workspace.

## How to run:

```bash
# Option 1: Just seed
pnpm seed

# Option 2: Reset database and seed
pnpm db:reset

# Option 3: Push schema and seed
pnpm db:push
```

## Testing the seeded data:

1. Go to http://localhost:3000/auth/login
2. Try any admin account (e.g., jfelke@alldigitalrewards.com)
3. Password: `Changemaker2025!`
4. You'll be redirected to /workspaces
5. Access workspace admin areas at `/w/{slug}/admin/challenges`
6. Test participant access with any participant account

## Workspace URLs:
- http://localhost:3000/w/acme
- http://localhost:3000/w/alldigitalrewards  
- http://localhost:3000/w/sharecare