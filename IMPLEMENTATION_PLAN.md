# RewardSTACK Integration & Points Budget Implementation Plan

## Phase 1: Fix Seed Determinism (PRIORITY)
- [ ] Investigate why only 9/30 participants are being created
- [ ] Ensure all orderBy clauses provide total ordering
- [ ] Add stable seed for any Math.random() calls
- [ ] Verify enrollment status assignment is deterministic

## Phase 2: RewardSTACK QA Integration
### 2.1 Authentication Client
- [ ] Create lib/rewardstack/auth.ts for JWT auth
- [ ] Implement login with admin@alldigitalrewards.com / password
- [ ] Handle token refresh logic
- [ ] Store tokens securely (env vars for now, later SSO)

### 2.2 API Client
- [ ] Create lib/rewardstack/client.ts for API calls
- [ ] Implement points issuance to marketplace (changemaker.adrsandbox.com)
- [ ] Implement SKU fulfillment (CVSEC100, CPEC50, APPLEWTCH)
- [ ] Add error handling and retry logic

### 2.3 Database Schema
- [ ] Add RewardSTACK credentials to WorkspaceEmailSettings or new table
- [ ] Add conversionRate to WorkspacePointsBudget (Platform admin sets)
- [ ] Add pointsPerActivity to ActivityTemplate (Workspace admin sets)

## Phase 3: Points Budget Management UI
### 3.1 Platform Admin Level
- [ ] Create /platform/settings page for platform admins
- [ ] Add conversion rate configuration (points → $ or RS credits)
- [ ] Display across all workspaces

### 3.2 Workspace Admin Level
- [ ] Add budget settings to /w/[slug]/admin/settings
- [ ] Show total budget, allocated, remaining
- [ ] Allow budget top-ups (manual for now)

### 3.3 Activity Configuration
- [ ] Add points field to activity creation form
- [ ] Show points on activity cards
- [ ] Validate against challenge budget

## Phase 4: Funding Balance Integration
### Discussion Points with Josh:
- How to sync RA/RS funding balance to Changemaker?
- Real-time API vs periodic sync?
- Display in admin dashboard?
- Alert when balance low?

## Phase 5: Reward Fulfillment Flow
- [ ] Create API endpoint /api/workspaces/[slug]/rewards/fulfill
- [ ] Integrate with RewardSTACK API for SKU orders
- [ ] Handle async fulfillment status updates
- [ ] Add webhook for fulfillment notifications

## Phase 6: End-to-End Testing
- [ ] Test points award → balance update
- [ ] Test points redemption → RS marketplace
- [ ] Test SKU fulfillment → delivery
- [ ] Verify budget tracking accuracy

---

## QA Environment Details
- **Admin Portal**: https://admin.adrqa.info
- **Credentials**: admin@alldigitalrewards.com / password
- **Program ID**: adr-changemaker-qa
- **Marketplace**: changemaker.adrsandbox.com
- **Test SKUs**: CVSEC100, CPEC50, APPLEWTCH
