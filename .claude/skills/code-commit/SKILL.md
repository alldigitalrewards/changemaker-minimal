# code-commit

**Purpose:** Create consistent, semantic git commits following Changemaker conventions.

## When to Invoke

Invoke this skill after:
- Completing a feature implementation
- Fixing a bug
- Refactoring code
- Adding tests
- Updating documentation
- Any code changes ready to commit

## Commit Message Format

Follow Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **chore**: Build process or auxiliary tool changes
- **ci**: CI configuration changes

### Scope (Optional)

Component or area affected:
- **auth**: Authentication/authorization
- **api**: API routes
- **db**: Database/Prisma
- **ui**: UI components
- **challenge**: Challenge-related features
- **enrollment**: Enrollment features
- **reward**: Reward system
- **workspace**: Workspace management
- **email**: Email templates/sending

### Subject

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Maximum 72 characters

### Body (Optional)

- Explain what and why, not how
- Wrap at 72 characters
- Leave blank line between subject and body

### Footer (Optional)

- Reference issues: `Closes #123` or `Fixes #456`
- Breaking changes: `BREAKING CHANGE: <description>`

## Workflow Steps

### Step 1: Review Changes

```bash
# Check status
git status

# Review diff
git diff

# Check unstaged changes
git diff HEAD
```

### Step 2: Stage Changes

```bash
# Stage specific files
git add <file1> <file2>

# Stage all changes (use carefully)
git add .

# Stage by hunks (interactive)
git add -p
```

### Step 3: Determine Commit Type

Based on changes, select appropriate type:

**feat**: New functionality
- Added new API route
- Created new component
- Implemented new feature

**fix**: Bug fixes
- Fixed authentication issue
- Resolved database query error
- Corrected UI rendering bug

**refactor**: Code improvements
- Extracted duplicate code
- Simplified logic
- Improved structure

**test**: Test additions/updates
- Added E2E tests
- Updated test fixtures
- Fixed failing tests

**docs**: Documentation
- Updated README
- Added API documentation
- Updated comments

### Step 4: Construct Commit Message

Use this template:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

<body if needed>

<footer if needed>
EOF
)"
```

### Step 5: Validate Before Push

```bash
# View commit
git log -1 --stat

# Amend if needed (only if not pushed!)
git commit --amend

# Push to remote
git push origin <branch>
```

## Commit Message Examples

### Feature Addition

```bash
git commit -m "feat(challenge): add challenge enrollment API endpoint

Implements POST /api/challenges/[id]/enroll endpoint for participants
to enroll in challenges. Includes workspace isolation validation and
enrollment status tracking.

Closes #42"
```

### Bug Fix

```bash
git commit -m "fix(auth): resolve workspace access validation

Fixed issue where participants could access admin routes by
manipulating workspace context. Added role validation to
requireWorkspaceAdmin middleware.

Fixes #87"
```

### Refactor

```bash
git commit -m "refactor(db): extract duplicate workspace query logic

Consolidated workspace filtering logic into reusable query functions
in lib/db/queries.ts. Reduces duplication and improves maintainability."
```

### Test Addition

```bash
git commit -m "test(enrollment): add E2E tests for enrollment flow

Added Playwright tests covering:
- Challenge enrollment by participant
- Workspace isolation validation
- Enrollment status tracking
- Error handling for duplicate enrollments"
```

### UI Component

```bash
git commit -m "feat(ui): add challenge card component with Changemaker theme

Created reusable ChallengeCard component using shadcn/ui Card.
Applies coral-500 theme colors and includes enrollment action button."
```

### Documentation

```bash
git commit -m "docs(api): add API route documentation

Documented all /api/challenges routes including:
- Request/response formats
- Authentication requirements
- Error handling
- Example usage"
```

### Breaking Change

```bash
git commit -m "feat(api)!: change API response format for challenges

Changed response from { data: { challenges } } to { challenges }
for consistency with other endpoints.

BREAKING CHANGE: API clients must update response handling to
access challenge data directly from response root instead of
nested data property."
```

## Pre-Commit Checklist

Before committing, verify:

- [ ] All changed files are intended
- [ ] No debug code or console.logs
- [ ] No commented-out code
- [ ] No hardcoded credentials or secrets
- [ ] Tests pass (if applicable)
- [ ] Build succeeds (if applicable)
- [ ] Workspace isolation maintained
- [ ] Types are correct
- [ ] Documentation updated (if needed)

## Common Patterns

### Multiple Related Changes

If changes span multiple areas but are part of one feature:

```bash
git commit -m "feat(reward): implement physical reward fulfillment

- Add shipping address model to Prisma schema
- Create shipping address collection form
- Integrate RewardSTACK API for SKU ordering
- Add shipping confirmation email template

Closes #103"
```

### Quick Fixes

For small, obvious fixes:

```bash
git commit -m "fix(ui): correct button color in challenge card

Use coral-500 instead of hardcoded hex value"
```

### Dependency Updates

```bash
git commit -m "chore(deps): update Next.js to 15.0.3

Updates Next.js and related dependencies for bug fixes and
performance improvements"
```

## Integration with Other Skills

### After workspace-isolation-check

```bash
# workspace-isolation-check passed
git add .
git commit -m "feat(api): add workspace-filtered challenge list endpoint

Implements GET /api/challenges with requireWorkspaceAccess validation.
All queries filter by workspaceId to maintain tenant isolation."
```

### After pattern-validation

```bash
# pattern-validation passed
git add .
git commit -m "feat(ui): add reward selection dialog

Created RewardSelectionDialog component using shadcn/ui Dialog.
Follows Changemaker theme with coral-500 colors and proper
TypeScript types."
```

### After integration-test

```bash
# integration-test passed
git add .
git commit -m "test(enrollment): add enrollment flow integration tests

Added tests covering enrollment creation, validation, and workspace
isolation. All tests passing."
```

## Tools to Use

### Git Commands

```bash
# Stage files
git add <file>

# Commit with message
git commit -m "message"

# Commit with multi-line message
git commit -m "$(cat <<'EOF'
Multi-line
message
EOF
)"

# Amend last commit (only if not pushed!)
git commit --amend

# View commit history
git log --oneline
git log -1 --stat

# Push to remote
git push origin <branch>
```

### Bash Tool Integration

Use the Bash tool in Claude Code:

```bash
# Review and commit workflow
git status
git add .
git commit -m "feat(api): add challenge creation endpoint"
git push origin feature/challenge-api
```

## Best Practices

### Commit Often
- Make small, focused commits
- One logical change per commit
- Don't combine unrelated changes

### Write Clear Messages
- Be descriptive but concise
- Explain why, not what (code shows what)
- Use present tense ("add" not "added")

### Reference Issues
- Link commits to issues/tasks
- Use keywords: Closes, Fixes, Resolves
- Include issue number in footer

### Atomic Commits
- Each commit should be buildable
- Tests should pass after each commit
- Don't break the build

### Sign Commits (Optional)
```bash
# If GPG signing is set up
git commit -S -m "message"
```

## Error Handling

### Undo Last Commit (Not Pushed)

```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes and commit
git reset --hard HEAD~1
```

### Amend Commit Message

```bash
# Change last commit message (not pushed!)
git commit --amend -m "new message"
```

### Split Large Commit

```bash
# Reset to unstage
git reset HEAD~1

# Stage and commit incrementally
git add file1
git commit -m "message 1"
git add file2
git commit -m "message 2"
```

## Integration with Agents

### Invoked by:
- All agents after completing implementation
- All agents after passing validation checks
- All agents before moving to next task

### Success Criteria
- Commit message follows conventions
- Changes are logically grouped
- Pre-commit checks passed
- Commit is atomic and buildable

---

**Version:** 1.0
**Last Updated:** 2024-11-12
**Maintained By:** Changemaker Development Team
