# Git Workflow Skill

## Description

Manage Git operations including commits, branch management, and pull request creation following Changemaker project conventions. Automatically handles commit message formatting, branch naming, PR descriptions with task references, and GitHub integration.

**When to use this skill:**
- User says: "commit", "create PR", "push changes", "make a commit", "open pull request", "commit these changes", "create branch"
- When code changes are ready to be committed
- When creating feature branches
- When opening pull requests
- When merging or managing branches
- NOT for running tests, database migrations, or code validation (other skills handle those)

## Instructions

### Core Principles

1. **Never commit without verification** - Always ensure tests pass before committing
2. **Follow commit conventions** - Use conventional commit format with task references
3. **Atomic commits** - One logical change per commit
4. **Descriptive messages** - Explain why, not just what
5. **Branch naming standards** - Use feature/, fix/, chore/ prefixes
6. **PR descriptions** - Include task references and testing notes

### Commit Message Format

**Standard format:**
```
<type>(<scope>): <subject>

<body>

Task: #<task-id>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Commit types:**
- `feat`: New feature implementation
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Maintenance tasks (dependencies, configs)
- `perf`: Performance improvements
- `style`: Code style changes (formatting, no logic change)

**Scope examples:**
- `auth`: Authentication/authorization
- `api`: API routes
- `db`: Database/schema changes
- `ui`: User interface components
- `rls`: Row-level security policies
- `tests`: Test-related changes

**Examples:**
```
feat(api): add maxParticipants field to Challenge model

Implemented participant limit functionality for challenges.
Updated schema, RLS policies, and API routes.

Task: #2.3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
fix(rls): correct workspace isolation in Enrollment policies

Fixed RLS policy that allowed cross-workspace enrollment access.
Added service role bypass for server operations.

Task: #3.1

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Standard Git Workflow

#### 1. Pre-Commit Validation

Before committing, ALWAYS verify:

```bash
# 1. TypeScript compilation
npx tsc --noEmit

# 2. Tests pass (use Test Suite Runner Skill)
npx playwright test tests/api/[relevant-tests].spec.ts --reporter=list

# 3. Check git status
git status
```

**Only proceed if:**
- No TypeScript errors
- All relevant tests pass
- Changes are intentional and complete

#### 2. Stage Changes

**Review what will be committed:**
```bash
# View unstaged changes
git diff

# View staged changes
git diff --cached

# Stage specific files
git add [file-path]

# Stage all changes (use cautiously)
git add .
```

**What to stage:**
- Source code changes
- Test files
- Configuration updates
- Documentation updates

**What NOT to stage:**
- `.env` or `.env.local` files
- `node_modules/`
- Build artifacts (`.next/`, `dist/`)
- Personal notes or scratch files
- Temporary test data

#### 3. Create Commit

**Generate commit message:**
1. Analyze staged changes
2. Determine type and scope
3. Write clear subject (max 72 chars)
4. Add detailed body if needed
5. Include Task Master reference if applicable
6. Add Claude Code footer

**Execute commit:**
```bash
git commit -m "$(cat <<'EOF'
feat(api): add participant limit to challenges

Implemented maxParticipants field with validation.
Updated Challenge model, API routes, and tests.
Verified workspace isolation maintained.

Task: #2.3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Multi-line commit best practices:**
- Subject line: concise summary (50-72 chars)
- Blank line after subject
- Body: detailed explanation (wrap at 72 chars)
- Bullet points for multiple changes
- Reference related tasks/issues

#### 4. Push Changes

**Check current branch:**
```bash
git branch --show-current
```

**Push to remote:**
```bash
# First time pushing new branch
git push -u origin [branch-name]

# Subsequent pushes
git push
```

**Verify push succeeded:**
```bash
git status
# Should show "Your branch is up to date with 'origin/[branch]'"
```

### Branch Management

#### Creating Branches

**Branch naming convention:**
```
<type>/<description>
```

**Types:**
- `feature/` - New feature development
- `fix/` - Bug fixes
- `chore/` - Maintenance tasks
- `refactor/` - Code restructuring
- `test/` - Test additions/updates

**Examples:**
```bash
# Create feature branch
git checkout -b feature/participant-limits

# Create fix branch
git checkout -b fix/rls-enrollment-policy

# Create refactor branch
git checkout -b refactor/api-error-handling
```

**Branch from correct base:**
```bash
# Always branch from main (or current feature branch for sub-tasks)
git checkout main
git pull origin main
git checkout -b feature/new-feature
```

#### Switching Branches

```bash
# Switch to existing branch
git checkout [branch-name]

# Create and switch to new branch
git checkout -b [branch-name]

# Return to main
git checkout main
```

#### Deleting Branches

```bash
# Delete local branch (after merging)
git branch -d [branch-name]

# Force delete (if not merged)
git branch -D [branch-name]

# Delete remote branch
git push origin --delete [branch-name]
```

### Pull Request Workflow

#### 1. PR Preparation

**Before creating PR:**
- All commits follow convention
- Tests pass locally
- Branch is up to date with main
- No merge conflicts

**Update branch with main:**
```bash
git checkout main
git pull origin main
git checkout [feature-branch]
git merge main
# Resolve any conflicts
git push
```

#### 2. Create Pull Request

**PR title format:**
```
<type>(<scope>): <description> [Task #X.X]
```

**Examples:**
```
feat(api): Add participant limit validation [Task #2.3]
fix(rls): Correct enrollment workspace isolation [Task #3.1]
```

**PR description template:**
```markdown
## Summary
Brief description of changes and why they were made.

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] TypeScript compiles without errors
- [ ] All API tests pass
- [ ] Security/RLS tests pass
- [ ] Manual testing completed

## Task Reference
Task: #X.X - [Task title]

## Deployment Notes
Any special considerations for deployment (migrations, config changes, etc.)

## Screenshots
[If UI changes, include screenshots]

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Create PR via GitHub CLI:**
```bash
gh pr create \
  --title "feat(api): Add participant limits [Task #2.3]" \
  --body "$(cat <<'EOF'
## Summary
Implemented participant limit functionality for challenges.

## Changes
- Added maxParticipants field to Challenge model
- Updated Prisma schema and ran migration
- Implemented validation in API routes
- Added tests for limit enforcement
- Updated RLS policies to include new field

## Testing
- [x] TypeScript compiles without errors
- [x] All API tests pass (23/23)
- [x] Security/RLS tests pass (8/8)
- [x] Manual testing completed

## Task Reference
Task: #2.3 - Implement participant limits

## Deployment Notes
- Requires database migration (included)
- No breaking changes to existing API

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

#### 3. PR Review Process

**After creating PR:**
1. Request reviewers if needed: `gh pr edit --add-reviewer [username]`
2. Monitor CI/CD checks
3. Address review comments
4. Update branch if needed

**Respond to feedback:**
```bash
# Make requested changes
# Stage and commit with descriptive message
git add [files]
git commit -m "fix: address PR review comments"
git push
# PR automatically updates
```

### GitHub Integration

#### Using GitHub CLI

**View PRs:**
```bash
# List open PRs
gh pr list

# View specific PR
gh pr view [pr-number]

# Check PR status
gh pr status
```

**Manage PRs:**
```bash
# Merge PR (after approval)
gh pr merge [pr-number] --squash

# Close PR without merging
gh pr close [pr-number]

# Reopen closed PR
gh pr reopen [pr-number]
```

**Issues integration:**
```bash
# Link PR to issue
gh pr edit --add-project [project-name]

# Reference issue in commit
git commit -m "fix: resolve login bug

Closes #42"
```

### Common Workflows

#### Workflow 1: Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/participant-limits

# 2. Implement feature (multiple commits)
# ... make changes ...
git add [files]
git commit -m "feat(api): add maxParticipants field"

# ... make more changes ...
git add [files]
git commit -m "test(api): add participant limit tests"

# 3. Push branch
git push -u origin feature/participant-limits

# 4. Create PR
gh pr create --title "feat(api): Add participant limits [Task #2.3]" --fill

# 5. After approval, merge
gh pr merge --squash
```

#### Workflow 2: Bug Fix

```bash
# 1. Create fix branch
git checkout -b fix/rls-enrollment-bug

# 2. Fix bug
# ... make changes ...
git add [files]
git commit -m "fix(rls): correct enrollment workspace isolation

Fixed policy allowing cross-workspace enrollments.

Task: #3.1"

# 3. Verify fix
npx playwright test tests/security/rls-fixture-test.spec.ts

# 4. Push and create PR
git push -u origin fix/rls-enrollment-bug
gh pr create --title "fix(rls): Correct enrollment isolation [Task #3.1]" --fill
```

#### Workflow 3: Quick Hotfix

```bash
# 1. Create fix branch from main
git checkout main
git pull origin main
git checkout -b fix/critical-auth-bug

# 2. Make minimal fix
# ... make changes ...
git add [files]
git commit -m "fix(auth): resolve session timeout bug"

# 3. Fast-track PR
git push -u origin fix/critical-auth-bug
gh pr create --title "fix(auth): Resolve session timeout [HOTFIX]" --fill
gh pr merge --admin  # If you have admin rights
```

### Commit Best Practices

**Do:**
- ✅ Run tests before committing
- ✅ Write descriptive commit messages
- ✅ Reference task numbers
- ✅ Keep commits atomic (one logical change)
- ✅ Review staged changes before committing
- ✅ Use conventional commit format
- ✅ Include Claude Code footer

**Don't:**
- ❌ Commit broken code
- ❌ Commit directly to main
- ❌ Use vague messages ("fix stuff", "updates")
- ❌ Commit secrets or credentials
- ❌ Commit large binary files
- ❌ Skip the Claude Code footer
- ❌ Forget task references

### Error Handling

**Common Git errors:**

**1. "Changes not staged for commit"**
```bash
# Stage specific files
git add [file-path]

# Or stage all
git add .
```

**2. "Your branch is behind 'origin/main'"**
```bash
# Update local branch
git pull origin main

# Or rebase (cleaner history)
git pull --rebase origin main
```

**3. "Merge conflict"**
```bash
# View conflicted files
git status

# Edit files to resolve conflicts
# Look for <<<<<<< HEAD markers

# After resolving
git add [resolved-files]
git commit -m "merge: resolve conflicts with main"
```

**4. "Nothing to commit"**
```bash
# Verify you made changes
git status

# Check if changes are staged
git diff --cached

# If needed, modify files and stage
```

**5. "Permission denied (publickey)"**
```bash
# Verify SSH key setup
ssh -T git@github.com

# Or use HTTPS instead
git remote set-url origin https://github.com/[user]/[repo].git
```

### Integration with Task Master

**Log commit activity:**
```bash
# After committing
task-master update-subtask --id=X.X --prompt="Committed changes: [summary]. Commit: [sha]"

# After PR creation
task-master update-subtask --id=X.X --prompt="Created PR #[number]: [title]. Link: [url]"

# After merge
task-master set-status --id=X.X --status=done
```

**Include task context in commits:**
```bash
# Reference task in commit body
git commit -m "feat(api): implement feature X

Implemented as specified in Task 2.3.
Includes schema changes, API routes, and tests.

Task: #2.3"
```

### Project-Specific Guidelines

**Changemaker commit standards:**

1. **Schema changes** always include:
   - Migration notes in commit body
   - RLS policy updates mentioned
   - Test verification noted

2. **API route changes** always include:
   - Affected endpoints listed
   - Breaking changes highlighted
   - Test coverage noted

3. **Security changes** always include:
   - Security impact assessment
   - RLS validation confirmation
   - Multi-tenant isolation verification

### Safety Checks

**Before every commit, verify:**
- [ ] No `.env` files staged
- [ ] No API keys or secrets in code
- [ ] No `console.log` debug statements (unless intentional)
- [ ] No commented-out code blocks
- [ ] No TODO comments without task reference
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Relevant tests pass

**Before every push, verify:**
- [ ] Commits follow convention
- [ ] Task references included
- [ ] Branch name follows convention
- [ ] No sensitive data in history

**Before every PR, verify:**
- [ ] All tests pass
- [ ] No merge conflicts with main
- [ ] PR description is complete
- [ ] Deployment notes included if needed

### Rollback Procedures

**Undo last commit (not pushed):**
```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes and commit
git reset --hard HEAD~1
```

**Revert pushed commit:**
```bash
# Create revert commit
git revert [commit-sha]
git push
```

**Emergency rollback:**
```bash
# Revert to specific commit
git reset --hard [commit-sha]
git push --force origin [branch]
# ⚠️ Use with extreme caution - rewrites history
```

## Examples

### Example 1: Commit Schema Change

```bash
# 1. Verify changes
git status
git diff prisma/schema.prisma

# 2. Run validation
npx tsc --noEmit
npx playwright test tests/api/challenge-crud.spec.ts --reporter=list

# 3. Stage changes
git add prisma/schema.prisma
git add app/api/w/[slug]/challenges/route.ts
git add tests/api/challenge-crud.spec.ts

# 4. Commit with proper message
git commit -m "$(cat <<'EOF'
feat(db): add maxParticipants field to Challenge model

Added participant limit functionality with validation.
Updated schema, API routes, and tests.
RLS policies verified to maintain workspace isolation.

Task: #2.3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# 5. Push
git push
```

### Example 2: Create Feature PR

```bash
# 1. Ensure branch is up to date
git checkout main
git pull origin main
git checkout feature/participant-limits
git merge main

# 2. Verify all commits follow convention
git log --oneline

# 3. Run full test suite
npx playwright test --reporter=list

# 4. Create PR
gh pr create \
  --title "feat(api): Add participant limit validation [Task #2.3]" \
  --body "$(cat <<'EOF'
## Summary
Implemented participant limit functionality for challenges.

## Changes
- Added maxParticipants field to Challenge model
- Implemented validation in create/update endpoints
- Added comprehensive test coverage
- Updated RLS policies

## Testing
- [x] TypeScript compiles (no errors)
- [x] API tests pass (25/25)
- [x] Security tests pass (8/8)
- [x] Manual testing completed

## Task Reference
Task: #2.3 - Implement participant limits

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

### Example 3: Emergency Hotfix

```bash
# 1. Create fix branch
git checkout main
git pull origin main
git checkout -b fix/session-timeout

# 2. Make minimal fix
# Edit files...
git add lib/auth/session.ts
git commit -m "fix(auth): increase session timeout to 24h

Session was expiring too quickly causing UX issues.
Updated timeout from 1h to 24h.

Fixes: #156"

# 3. Quick test
npx playwright test tests/api/auth.spec.ts --reporter=list

# 4. Push and merge quickly
git push -u origin fix/session-timeout
gh pr create --title "fix(auth): Increase session timeout [HOTFIX]" --fill
gh pr merge --admin --squash
```

## Success Criteria

After using this skill, verify:

- [ ] Commits follow conventional format
- [ ] Task references included where applicable
- [ ] Claude Code footer present
- [ ] No secrets or sensitive data committed
- [ ] Tests passed before committing
- [ ] Branch naming follows convention
- [ ] PR description is complete and clear
- [ ] No merge conflicts exist

## Related Skills

- **Test Suite Runner Skill** - Verify tests before committing
- **Task Master Integration Skill** - Log commits and PRs to tasks
- **Database Schema Migration Skill** - Handle schema-related commits

---

*This skill ensures clean, professional Git workflows with proper documentation and traceability.*
