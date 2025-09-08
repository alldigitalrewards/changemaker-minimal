# Changemaker Platform Testing Scenarios

This document provides comprehensive testing scenarios for the Changemaker platform, organized by feature area, user role, priority, and test type.

## Platform Architecture Overview

- **Multi-tenant System**: Path-based workspaces (`/w/[slug]`)
- **Authentication**: Supabase Auth with Prisma user sync
- **Roles**: ADMIN, PARTICIPANT
- **Core Entities**: Workspace, User, Challenge, Enrollment
- **Database**: PostgreSQL with Prisma ORM

---

## 1. Authentication & User Management

### 1.1 User Registration & Login (Critical - E2E)

**Scenario A1.1**: New user registration flow
- **Given**: User visits `/auth/signup`
- **When**: User enters valid email and password
- **Then**: 
  - Account created in Supabase
  - User redirected to workspaces page
  - User record created in Prisma database via sync
- **Test Data**: `newuser@example.com`, `SecurePass123!`

**Scenario A1.2**: Existing user login
- **Given**: User has existing account
- **When**: User visits `/auth/login` and enters credentials
- **Then**:
  - Authentication successful
  - Session established
  - Redirected to appropriate dashboard based on role
- **Test Data**: `admin@changemaker.test`, `participant@changemaker.test`

**Scenario A1.3**: Invalid login attempts
- **Given**: User at login page
- **When**: User enters wrong password/non-existent email
- **Then**: Clear error message, no redirect
- **Test Data**: `nonexistent@test.com`, `wrongpassword123`

### 1.2 User-Database Sync (High - Integration)

**Scenario A2.1**: Automatic user sync on first login
- **Given**: New Supabase user (no Prisma record)
- **When**: User logs in for first time
- **Then**: 
  - User record created in Prisma
  - `supabaseUserId` field populated
  - Default role assigned
- **API Endpoint**: `POST /api/auth/sync-user`

**Scenario A2.2**: Sync failure handling
- **Given**: Database connection issues
- **When**: User attempts sync
- **Then**: Graceful error handling, retry mechanism
- **Expected Error**: Database connection error

---

## 2. Workspace Management

### 2.1 Workspace Creation & Access (Critical - E2E)

**Scenario W1.1**: Admin creates new workspace
- **Given**: Authenticated user with ADMIN role
- **When**: User creates workspace with slug "innovation-lab"
- **Then**:
  - Workspace created with unique slug
  - Creator assigned as ADMIN to workspace
  - Accessible at `/w/innovation-lab`
- **Test Data**: 
  ```json
  {
    "name": "Innovation Lab",
    "slug": "innovation-lab"
  }
  ```

**Scenario W1.2**: Workspace slug validation
- **Given**: User creating workspace
- **When**: User enters invalid slug (spaces, special chars, too long)
- **Then**: Validation errors displayed
- **Invalid Test Data**: 
  - `"my workspace"` (spaces)
  - `"special@chars!"` (special characters)
  - `"a-very-long-slug-name-that-exceeds-the-fifty-character-limit-for-workspace-slugs"` (too long)

**Scenario W1.3**: Workspace slug uniqueness
- **Given**: Workspace "innovation-lab" already exists
- **When**: User tries to create another workspace with same slug
- **Then**: Error message about slug already taken
- **Expected Error**: "Workspace slug already exists"

### 2.2 Workspace Access Control (Critical - Security)

**Scenario W2.1**: Unauthorized workspace access
- **Given**: User belongs to workspace "team-a"
- **When**: User tries to access `/w/team-b/admin/dashboard`
- **Then**: 
  - Middleware blocks access
  - Redirected to appropriate page
- **Test Data**: User in workspace ID `ws-001` accessing workspace ID `ws-002`

**Scenario W2.2**: Role-based route protection
- **Given**: PARTICIPANT user in workspace
- **When**: User tries to access `/w/[slug]/admin/*` routes
- **Then**: Redirected to participant dashboard
- **Expected Redirect**: `/w/[slug]/participant/dashboard`

**Scenario W2.3**: Unauthenticated access attempt
- **Given**: No user session
- **When**: User tries to access `/w/[slug]/*`
- **Then**: Redirected to login page
- **Expected Redirect**: `/auth/login`

---

## 3. Challenge Management

### 3.1 Challenge Creation (High - E2E)

**Scenario C1.1**: Admin creates challenge
- **Given**: ADMIN user in workspace "innovation-lab"
- **When**: Admin creates challenge via `/w/innovation-lab/admin/challenges`
- **Then**:
  - Challenge created with workspace association
  - Visible to all workspace participants
  - Returns challenge ID and details
- **API Endpoint**: `POST /api/workspaces/innovation-lab/challenges`
- **Test Data**:
  ```json
  {
    "title": "Sustainability Challenge",
    "description": "Develop innovative solutions for reducing office waste and promoting sustainable practices in the workplace."
  }
  ```

**Scenario C1.2**: Challenge validation
- **Given**: Admin creating challenge
- **When**: Admin submits form with empty/invalid data
- **Then**: Validation errors displayed
- **Invalid Test Data**:
  - Empty title: `""`
  - Empty description: `""`
  - Only whitespace: `"   "`

**Scenario C1.3**: Participant cannot create challenges
- **Given**: PARTICIPANT user in workspace
- **When**: Participant attempts to POST to challenges API
- **Then**: 403 Forbidden error
- **Expected Error**: "Admin privileges required to create challenges"

### 3.2 Challenge Listing & Search (Medium - Integration)

**Scenario C2.1**: Admin views all challenges
- **Given**: Workspace with 5 challenges
- **When**: Admin visits challenges page
- **Then**: All challenges displayed with management options
- **API Endpoint**: `GET /api/workspaces/[slug]/challenges`

**Scenario C2.2**: Participant challenge search
- **Given**: Participant on challenges page
- **When**: Participant searches for "sustainability"
- **Then**: Only matching challenges displayed
- **Search Query**: `?search=sustainability`

**Scenario C2.3**: Empty search results
- **Given**: Participant searches for non-existent term
- **When**: Search submitted for "nonexistent"
- **Then**: "No challenges found" message displayed

---

## 4. Enrollment System

### 4.1 Challenge Enrollment (Critical - E2E)

**Scenario E1.1**: Participant enrolls in challenge
- **Given**: PARTICIPANT user viewing available challenges
- **When**: User clicks "Enroll" on challenge card
- **Then**:
  - Enrollment record created
  - Challenge marked as "Enrolled" for user
  - Enrollment count updated
- **API Endpoint**: `POST /api/workspaces/[slug]/enrollments`
- **Test Data**:
  ```json
  {
    "challengeId": "challenge-uuid",
    "userId": "user-uuid"
  }
  ```

**Scenario E1.2**: Prevent duplicate enrollment
- **Given**: User already enrolled in challenge
- **When**: User attempts to enroll again
- **Then**: Error message or disabled button
- **Expected Error**: "Already enrolled in this challenge"

**Scenario E1.3**: Enrollment status tracking
- **Given**: User enrolled in challenge
- **When**: Viewing challenge card
- **Then**: Clear visual indicator of enrollment status
- **UI Element**: "Enrolled" badge on challenge card

### 4.2 Enrollment Management (Medium - Integration)

**Scenario E2.1**: View enrollments dashboard
- **Given**: Participant with multiple enrollments
- **When**: User visits participant dashboard
- **Then**: All enrollments displayed with status
- **Expected Statuses**: PENDING, ACTIVE, COMPLETED, WITHDRAWN

**Scenario E2.2**: Admin views participation metrics
- **Given**: Admin user in workspace
- **When**: Admin views dashboard or analytics
- **Then**: Enrollment counts and participation rates displayed

---

## 5. Dashboard & Navigation

### 5.1 Role-Based Dashboards (High - E2E)

**Scenario D1.1**: Admin dashboard access
- **Given**: ADMIN user in workspace
- **When**: User navigates to `/w/[slug]/admin/dashboard`
- **Then**:
  - Dashboard displays admin-specific metrics
  - Management links visible
  - Challenges overview present
- **Expected Elements**: Challenge count, participant count, recent activity

**Scenario D1.2**: Participant dashboard access
- **Given**: PARTICIPANT user in workspace
- **When**: User navigates to `/w/[slug]/participant/dashboard`
- **Then**:
  - Dashboard shows enrolled challenges
  - Personal progress visible
  - Browse challenges link available
- **Expected Elements**: My challenges, enrollment status, progress indicators

**Scenario D1.3**: Cross-role navigation prevention
- **Given**: PARTICIPANT user
- **When**: User tries to access admin routes directly
- **Then**: Redirected to participant dashboard
- **Test URLs**: `/w/[slug]/admin/*` routes

### 5.2 Workspace Navigation (Medium - UI)

**Scenario D2.1**: Workspace context in navigation
- **Given**: User in workspace "innovation-lab"
- **When**: User navigates through the app
- **Then**: Workspace name displayed in navigation/header
- **UI Element**: Workspace name in navigation bar

**Scenario D2.2**: Role-appropriate menu items
- **Given**: User with specific role
- **When**: User views navigation menu
- **Then**: Only relevant menu items displayed
- **Admin Menu**: Dashboard, Challenges, Participants, Settings
- **Participant Menu**: Dashboard, Browse Challenges, My Progress

---

## 6. API Security & Error Handling

### 6.1 Authentication & Authorization (Critical - Security)

**Scenario S1.1**: API requires authentication
- **Given**: Unauthenticated request
- **When**: Request sent to any `/api/workspaces/[slug]/*` endpoint
- **Then**: 401 Unauthorized response
- **Headers**: No Authorization header or invalid token

**Scenario S1.2**: Workspace isolation
- **Given**: User belongs to workspace A
- **When**: User tries to access workspace B's data via API
- **Then**: 403 Forbidden response
- **Test Case**: User in `ws-001` accessing `/api/workspaces/ws-002/challenges`

**Scenario S1.3**: Role-based API access
- **Given**: PARTICIPANT user
- **When**: User attempts admin-only API endpoints
- **Then**: 403 Forbidden with appropriate message
- **Admin-only endpoints**: `POST /api/workspaces/[slug]/challenges`

### 6.2 Data Validation & Error Handling (High - Security)

**Scenario S2.1**: SQL injection prevention
- **Given**: Malicious input in API request
- **When**: Request contains SQL injection attempt
- **Then**: Input sanitized, no database compromise
- **Malicious Data**: `'; DROP TABLE challenges; --`

**Scenario S2.2**: XSS prevention
- **Given**: User enters script tags in form fields
- **When**: Data displayed in UI
- **Then**: Script tags escaped/sanitized
- **Malicious Data**: `<script>alert('xss')</script>`

**Scenario S2.3**: Request size limits
- **Given**: Oversized API request
- **When**: Request exceeds size limits
- **Then**: 413 Payload Too Large response
- **Test Data**: Very large description field (>10KB)

---

## 7. Database Operations & Data Integrity

### 7.1 CRUD Operations (High - Integration)

**Scenario DB1.1**: Challenge CRUD lifecycle
- **Given**: Admin user with proper permissions
- **When**: Complete CRUD operations performed
- **Then**: All operations succeed with data integrity
- **Operations**: Create → Read → Update → Delete
- **Validation**: Foreign key constraints maintained

**Scenario DB1.2**: Enrollment constraint validation
- **Given**: Enrollment creation request
- **When**: Duplicate user-challenge combination attempted
- **Then**: Database constraint prevents duplicate
- **Expected Error**: Unique constraint violation

**Scenario DB1.3**: Cascade deletion behavior
- **Given**: Workspace with challenges and enrollments
- **When**: Challenge deleted
- **Then**: Associated enrollments also deleted
- **Verification**: No orphaned enrollment records

### 7.2 Transaction Integrity (Medium - Integration)

**Scenario DB2.1**: Concurrent enrollment handling
- **Given**: Multiple users enrolling in same challenge simultaneously
- **When**: Concurrent requests processed
- **Then**: All enrollments processed correctly without data corruption
- **Concurrency**: 10 simultaneous enrollment requests

**Scenario DB2.2**: Rollback on partial failure
- **Given**: Multi-step database operation
- **When**: One step fails midway
- **Then**: Entire transaction rolled back
- **Example**: User creation + workspace assignment failure

---

## 8. Performance & Scalability

### 8.1 Load Testing (Medium - Performance)

**Scenario P1.1**: High user concurrency
- **Given**: Multiple users accessing platform simultaneously
- **When**: 100 concurrent users browsing challenges
- **Then**: Response times remain under 2 seconds
- **Metrics**: Average response time, error rate

**Scenario P1.2**: Database query optimization
- **Given**: Large number of challenges and enrollments
- **When**: User loads challenges page
- **Then**: Query completes efficiently with indexes
- **Test Data**: 1000+ challenges, 10000+ enrollments

### 8.2 Resource Management (Low - Performance)

**Scenario P2.1**: Memory usage monitoring
- **Given**: Extended platform usage
- **When**: Multiple operations performed over time
- **Then**: No memory leaks detected
- **Monitoring**: Memory usage patterns over 24 hours

---

## 9. Edge Cases & Error Scenarios

### 9.1 Data Edge Cases (Medium - Reliability)

**Scenario E1.1**: Empty database handling
- **Given**: New workspace with no challenges
- **When**: Participant views challenges page
- **Then**: Appropriate empty state displayed
- **UI Element**: "No challenges available yet" message

**Scenario E1.2**: Extremely long content
- **Given**: Challenge with very long description (near DB limit)
- **When**: Challenge displayed in UI
- **Then**: Content properly truncated/paginated
- **Test Data**: 10000+ character description

**Scenario E1.3**: Special character handling
- **Given**: User enters international characters
- **When**: Data saved and retrieved
- **Then**: Characters preserved correctly
- **Test Data**: "Défi d'Innovation 🚀", "挑戦プロジェクト"

### 9.2 Network & Service Failures (Medium - Reliability)

**Scenario E2.1**: Database connection failure
- **Given**: Database temporarily unavailable
- **When**: User performs action requiring database
- **Then**: Graceful error message, retry option
- **Expected Behavior**: Circuit breaker pattern

**Scenario E2.2**: Supabase Auth service failure
- **Given**: Supabase Auth temporarily down
- **When**: User attempts authentication
- **Then**: Clear error message, fallback behavior
- **Fallback**: Local session validation if possible

---

## 10. Test Implementation Guidelines

### 10.1 Test Environment Setup

**Database Configuration**:
```sql
-- Test database schema
CREATE DATABASE changemaker_test;
-- Use separate database for each test suite
-- Reset database state between test runs
```

**Environment Variables**:
```env
DATABASE_URL="postgresql://test:test@localhost:5432/changemaker_test"
NEXT_PUBLIC_SUPABASE_URL="https://test-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="test-key"
SUPABASE_SERVICE_ROLE_KEY="test-service-key"
```

### 10.2 Test Data Factory

**User Test Data**:
```typescript
export const testUsers = {
  admin: {
    email: 'admin@changemaker.test',
    password: 'TestAdmin123!',
    role: 'ADMIN'
  },
  participant: {
    email: 'participant@changemaker.test',
    password: 'TestParticipant123!',
    role: 'PARTICIPANT'
  }
};
```

**Workspace Test Data**:
```typescript
export const testWorkspaces = {
  primary: {
    name: 'Test Workspace',
    slug: 'test-workspace'
  },
  secondary: {
    name: 'Secondary Workspace',
    slug: 'secondary-workspace'
  }
};
```

### 10.3 Test Categories

**Unit Tests** (lib/, components/):
- Utility functions
- Type guards
- Validation functions
- Individual components

**Integration Tests** (API routes):
- API endpoint functionality
- Database operations
- Authentication flows

**End-to-End Tests** (full user flows):
- User registration → workspace creation → challenge creation → enrollment
- Role-based access control
- Complete user journeys

### 10.4 Continuous Integration

**Pre-commit Hooks**:
- Run unit tests
- Type checking
- Lint checking
- Format checking

**CI Pipeline**:
1. Install dependencies
2. Run database migrations
3. Execute test suites
4. Generate coverage reports
5. Deploy to staging (if tests pass)

---

## 11. Test Execution Priority

### Critical (Must Pass Before Release)
- Authentication & user management
- Workspace access control
- Challenge creation and enrollment
- Role-based route protection
- API security

### High Priority (Important for Quality)
- Database integrity
- Error handling
- Data validation
- Performance under normal load

### Medium Priority (Quality of Life)
- UI responsiveness
- Search functionality  
- Edge case handling
- Error messages clarity

### Low Priority (Nice to Have)
- Performance optimization
- Advanced features
- Extensive load testing
- Memory usage optimization

---

This testing framework provides comprehensive coverage of the Changemaker platform's core functionality, security requirements, and user experience. Each scenario includes specific test data, expected outcomes, and implementation guidance to ensure thorough validation of the platform's capabilities.