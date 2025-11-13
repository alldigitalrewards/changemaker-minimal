# Changemaker QA Environment Testing Guide

This document provides all necessary information for testing reward issuance in the Changemaker QA environment.

## QA Environment Configuration

### Program Details
- **Program ID**: `adr-changemaker-qa`
- **Program Name**: All Digital Rewards Changemaker - QA
- **Organization Name**: All Digital Rewards
- **Organization ID**: `alldigitalrewards`
- **Environment**: QA
- **Base URL**: `https://admin.adrqa.info`

### Marketplace
- **URL**: [changemaker.adrsandbox.com](https://changemaker.adrsandbox.com)
- Use this URL for participants to redeem points and select rewards

## Test Credentials

Credentials are configured in `.env` and `.env.local`:

```bash
REWARDSTACK_USERNAME="admin@alldigitalrewards.com"
REWARDSTACK_PASSWORD="password"
REWARDSTACK_PROGRAM_ID="adr-changemaker-qa"
REWARDSTACK_ORG_ID="alldigitalrewards"
REWARDSTACK_ENVIRONMENT="QA"
```

## Available Test SKUs

The following SKUs are available for testing in the QA environment:

### 1. CVSEC100 - CVS $100 eGift Card
- **SKU ID**: `CVSEC100`
- **Name**: CVS $100 eGift Card
- **Description**: CVS Pharmacy electronic gift card worth $100
- **Value**: 10,000 points ($100.00)
- **Type**: Digital reward
- **Use Case**: Test high-value digital reward fulfillment

### 2. CPEC50 - $50 Digital Reward
- **SKU ID**: `CPEC50`
- **Name**: $50 Digital Reward
- **Description**: Digital reward card worth $50
- **Value**: 5,000 points ($50.00)
- **Type**: Digital reward
- **Use Case**: Test mid-value digital reward fulfillment

### 3. APPLEWTCH - Apple Watch
- **SKU ID**: `APPLEWTCH`
- **Name**: Apple Watch
- **Description**: Apple Watch reward (physical product)
- **Value**: 40,000 points ($400.00)
- **Type**: Physical product
- **Use Case**: Test physical product reward fulfillment

## Testing Workflows

### 0. SKU Catalog Sync Testing

**Test Location**: `http://localhost:3000/w/alldigitalrewards/admin/settings`

**Steps**:
1. Login as admin (e.g., `jfelke@alldigitalrewards.com`)
2. Navigate to Admin > Settings
3. Scroll to "RewardSTACK Integration" section
4. Ensure RewardSTACK is enabled and configured
5. Click "Sync SKUs from Program Catalog" button
6. Confirm sync completes successfully

**Expected Result**:
- API call to RewardSTACK `/catalog` endpoint
- All available SKUs fetched from program catalog
- New SKUs created in WorkspaceSku table
- Existing SKUs updated with latest information
- Success toast showing number of synced/updated SKUs
- Page refreshes to show updated configuration

**Verification**:
```sql
-- Check synced SKUs in database
SELECT * FROM "WorkspaceSku" WHERE "workspaceId" = '<workspace-id>';
```

### 0.1. Participant Sync Testing

**Test Location**: `http://localhost:3000/w/alldigitalrewards/admin/settings`

**Manual Sync**:
1. Login as admin (e.g., `jfelke@alldigitalrewards.com`)
2. Navigate to Admin > Settings
3. Scroll to "RewardSTACK Integration" section
4. Ensure RewardSTACK is enabled and configured
5. Click "Sync Participants with RewardSTACK" button
6. Wait for sync to complete

**Expected Result**:
- API fetches all workspace members from database
- Each member synced to RewardSTACK as participant (POST `/participant` or PUT if exists)
- Success toast showing number of synced participants
- If any participants fail, separate toast showing failed count
- Error details logged to browser console

**Automatic Sync Triggers**:

Participants are automatically synced to RewardSTACK when:

1. **Invite Redemption** (`lib/db/invitations.ts:redeemInviteCode`)
   - When: User redeems an invite code and joins a workspace
   - Condition: Workspace has RewardSTACK enabled
   - Behavior: After membership created, automatically syncs participant with user's current details
   - Error handling: Logs error but doesn't fail invite redemption

2. **Profile Update** (`app/api/account/profile/route.ts`)
   - When: User updates their firstName or lastName
   - Condition: User is a member of workspaces with RewardSTACK enabled
   - Behavior: Syncs updated details to all RewardSTACK-enabled workspaces where user is a member
   - Error handling: Logs error but doesn't fail profile update

**Verification**:
```bash
# Check RewardSTACK API directly
curl -X GET https://admin.adrqa.info/api/program/adr-changemaker-qa/participant/{userId} \
  -H "Authorization: Bearer {JWT_TOKEN}"

# Check server logs for auto-sync messages
# Success: "Auto-synced participant {email} to RewardSTACK for workspace {slug}"
# Error: "Failed to auto-sync participant to RewardSTACK: {error}"
```

**Common Scenarios**:
- **New Participant**: Creates participant in RewardSTACK with uniqueId=userId
- **Existing Participant (409 Conflict)**: Updates participant with latest info
- **Invalid Email**: Logs error, continues with other participants
- **Network Error**: Shows error toast, logs details to console
- **Auto-sync Failure**: Operation (invite redemption or profile update) succeeds, error logged only

### 1. Points Issuance Testing

**Test Location**: `http://localhost:3000/w/alldigitalrewards/admin/rewards`

**Steps**:
1. Login as admin (e.g., `jfelke@alldigitalrewards.com`)
2. Navigate to Admin > Rewards
3. Click "Issue Reward"
4. Select reward type: "Points"
5. Select a participant
6. Enter amount (e.g., 1000 = $10.00)
7. Add description
8. Submit

**Expected Result**:
- Reward created with status PENDING
- API call to RewardSTACK `/adjustment` endpoint
- Response contains `adjustmentId` and updated `balance`
- Status updated to ISSUED
- Record saved in database with `rewardStackTransactionId`

### 2. SKU Reward Testing

**Test Location**: `http://localhost:3000/w/alldigitalrewards/admin/rewards`

**Steps**:
1. Login as admin
2. Navigate to Admin > Rewards
3. Click "Issue Reward"
4. Select reward type: "SKU"
5. Select a participant
6. Choose SKU (CVSEC100, CPEC50, or APPLEWTCH)
7. Add description
8. Submit

**Expected Result**:
- Reward created with status PENDING
- SKU validation against WorkspaceSku table
- Record saved with SKU details
- Webhook notification to RewardSTACK
- Status updated based on fulfillment response

### 3. Reward Detail Dialog Testing

**Steps**:
1. Navigate to rewards list
2. Click on any reward issuance row
3. Detail dialog opens showing:
   - Issuance status
   - RewardSTACK status
   - Transaction ID
   - Participant information
   - Reward details (type, amount, SKU)
   - Timeline (created, issued)
   - Webhook event history
   - Error messages (if any)

## API Endpoints

### Issue Points
```http
POST /api/workspaces/alldigitalrewards/rewards/issue
Content-Type: application/json

{
  "type": "points",
  "userId": "user-uuid",
  "amount": 1000,
  "description": "Completed onboarding challenge"
}
```

### Issue SKU
```http
POST /api/workspaces/alldigitalrewards/rewards/issue
Content-Type: application/json

{
  "type": "sku",
  "userId": "user-uuid",
  "skuId": "CPEC50",
  "description": "Monthly performance bonus"
}
```

## RewardSTACK API Call Flow

When issuing rewards, the system makes different API calls depending on the reward type:

### Points Rewards (Adjustment Endpoint)

```http
POST https://admin.adrqa.info/api/program/adr-changemaker-qa/participant/{userId}/adjustment
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "amount": 1000,
  "type": "credit",
  "description": "Completed onboarding challenge"
}
```

**Response**:
```json
{
  "adjustmentId": "adj_1234567890",
  "amount": 1000,
  "type": "credit",
  "timestamp": "2025-01-07T12:34:56Z",
  "balance": 5000
}
```

### SKU Rewards (Transaction Endpoint)

```http
POST https://admin.adrqa.info/api/program/adr-changemaker-qa/participant/{userId}/transaction
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "description": "Monthly performance bonus",
  "products": [
    {
      "sku": "CPEC50",
      "quantity": 1
    }
  ]
}
```

**Response**:
```json
{
  "transactionId": "txn_0987654321",
  "amount": 50.00,
  "timestamp": "2025-01-07T12:34:56Z",
  "products": [
    {
      "sku": "CPEC50",
      "quantity": 1
    }
  ]
}
```

## Database Schema

Rewards are stored in the `RewardIssuance` table with the following key fields:

- `id`: Unique identifier
- `userId`: Participant receiving the reward
- `workspaceId`: Workspace context
- `type`: "points" or "sku"
- `amount`: Value in cents
- `skuId`: RewardSTACK SKU ID (for SKU rewards)
- `status`: PENDING, ISSUED, FAILED, CANCELLED
- `rewardStackStatus`: Status from RewardSTACK (PENDING, PROCESSING, COMPLETED, FAILED, RETURNED)
- `rewardStackTransactionId`: Transaction ID from RewardSTACK
- `rewardStackErrorMessage`: Error details if failed
- `issuedBy`: Admin who issued the reward
- `createdAt`: Creation timestamp
- `issuedAt`: Issuance timestamp

## Troubleshooting

### Authentication Errors (401)
- Token may be expired
- System automatically retries with fresh token
- Check credentials in `.env`

### SKU Not Found (400)
- Verify SKU exists in WorkspaceSku table
- Run `pnpm tsx prisma/seed.ts` to populate test SKUs
- Check SKU is marked as `isActive: true`

### RewardSTACK API Errors
- Check logs in reward detail dialog
- View webhook event history
- Verify network connectivity to `admin.adrqa.info`
- Confirm QA environment is operational

## Seeding Test Data

To populate the database with test SKUs:

```bash
# Local database
pnpm tsx prisma/seed.ts

# Remote staging database
export DIRECT_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:Changemaker2025!@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
pnpm tsx prisma/seed.ts
```

This will create:
- 3 workspaces (acme, alldigitalrewards, sharecare)
- Admin users with appropriate permissions
- 3 QA test SKUs for each workspace
- Sample reward issuances for testing

## Platform Admin Monitoring

**Test Location**: `http://localhost:3000/admin/workspaces/[workspaceId]`

**Features**:
- Real-time connection status to RewardSTACK API
- Live program details fetched from RewardSTACK
- Integration statistics showing:
  - Synced SKUs count
  - Workspace members count
  - Issued rewards count
  - Available SKUs in RewardSTACK catalog
- Webhook configuration status
- Manual refresh capability
- Environment and credential display

**Steps**:
1. Login as platform admin
2. Navigate to Admin > Workspaces
3. Click on any workspace
4. Click "RewardSTACK" tab
5. View real-time monitoring dashboard

**Expected Result**:
- Connection status badge (Connected/Error/Unknown)
- RewardSTACK program details (name, status, type, available SKUs)
- Local statistics (synced SKUs, members, issued rewards)
- Refresh button to reload stats from API
- Webhook configuration status
- Last checked timestamp

**API Endpoint**: `GET /api/admin/workspaces/[workspaceId]/rewardstack/stats`

## Related Files

- **Seed Script**: `prisma/seed.ts` (lines 648-689)
- **API Routes**:
  - `app/api/workspaces/[slug]/rewards/issue/route.ts` - Issue rewards endpoint
  - `app/api/workspaces/[slug]/rewardstack/sync-skus/route.ts` - SKU catalog sync endpoint
  - `app/api/workspaces/[slug]/rewardstack/sync-participants/route.ts` - Participant sync endpoint
  - `app/api/workspaces/[slug]/rewardstack/toggle/route.ts` - Enable/disable integration (workspace admin)
  - `app/api/workspaces/[slug]/rewardstack/test-connection/route.ts` - Test connection with stored or provided credentials
  - `app/api/admin/workspaces/[workspaceId]/rewardstack/stats/route.ts` - Platform admin monitoring stats
- **RewardSTACK Service**: `lib/rewardstack/service.ts` - Service layer with `issuePoints()`, `createTransaction()`, `getCatalog()`, `syncParticipant()`
- **RewardSTACK Client**: `lib/rewardstack/client.ts` - HTTP client with JWT auth
- **RewardSTACK Auth**: `lib/rewardstack/auth.ts` - Token generation and caching
- **RewardSTACK Types**: `lib/rewardstack/types.ts` - TypeScript interfaces for API
- **Configuration Components**:
  - `components/admin/rewardstack-config.tsx` - Full platform admin configuration UI
  - `components/admin/workspace-rewardstack-settings.tsx` - Simplified workspace admin UI (enable/disable, sync, test)
  - `components/admin/rewardstack-monitoring.tsx` - Platform admin real-time monitoring dashboard
- **Issue Dialog**: `components/admin/reward-issuance-dialog.tsx` - Reward issuance form
- **Detail Dialog**: `components/admin/reward-issuance-detail-dialog.tsx` - Reward details view
- **Rewards Page**: `app/w/[slug]/admin/rewards/page.tsx` - Rewards management page
- **Settings Pages**:
  - `app/w/[slug]/admin/settings/page.tsx` - Workspace admin settings (simplified RewardSTACK controls)
  - `app/admin/workspaces/[workspaceId]/page.tsx` - Platform admin workspace detail (full monitoring and config)

## Additional Resources

- RewardSTACK API Documentation: Contact AllDigitalRewards for access
- Changemaker Schema: `prisma/schema.prisma` (WorkspaceSku model at line 440)
- Environment Configuration: `.env` and `.env.local`
