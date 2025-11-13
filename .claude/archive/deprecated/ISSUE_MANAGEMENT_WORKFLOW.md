# Issue Management Workflow - Automated GitHub/Linear Sync

**Last Updated**: 2025-10-27
**Owner**: Jack Felke (@TerminalGravity)

## Overview

Automated workflow for seeding, syncing, and maintaining GitHub/Linear issues using Claude Code, GitHub Actions, and `.claude/` documentation as the source of truth.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Source of Truth (.claude/)                    │
├─────────────────────────────────────────────────────────────────┤
│  PROGRESS.md → Task definitions with status                     │
│  implementation-roadmap.md → Detailed specifications            │
│  workflow.json → Issue metadata and relationships               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              Claude Code Issue Seeder                           │
│  - Parses .claude/ docs                                         │
│  - Generates issue templates                                    │
│  - Creates issues in GitHub/Linear                              │
│  - Maintains bidirectional sync                                 │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────┬──────────────────────────────────────┐
│      GitHub Issues       │        Linear Issues                 │
│  - Phase labels          │  - Project tracking                  │
│  - Task status           │  - Cycle assignment                  │
│  - Auto-close on merge   │  - Priority levels                   │
└──────────────┬───────────┴───────────────┬──────────────────────┘
               │                           │
               ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              GitHub Actions CI/CD Pipeline                      │
│  on: push (any branch)                                          │
│  1. Detect .claude/ file changes                                │
│  2. Run Claude Code to analyze diffs                            │
│  3. Update related issues automatically                         │
│  4. Post status comments                                        │
│  5. Auto-close completed tasks on merge                         │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow Components

### 1. Source of Truth Structure

**`.claude/workflow.json`** - Issue tracking metadata
```json
{
  "version": "1.0.0",
  "lastSync": "2025-10-27T10:00:00Z",
  "projects": {
    "manager-role": {
      "phases": [
        {
          "id": "phase-1",
          "name": "Foundation",
          "tasks": [
            {
              "id": "1",
              "title": "Database Schema Design",
              "status": "done",
              "githubIssue": 123,
              "linearIssue": "CHG-45",
              "files": ["prisma/schema.prisma"],
              "dependencies": [],
              "estimateHours": 3
            }
          ]
        }
      ]
    }
  }
}
```

**`.claude/PROGRESS.md`** - Human-readable task list
- Detailed task descriptions
- Current status and completion %
- Time estimates and actuals
- Session notes and blockers

**`.claude/implementation-roadmap.md`** - Technical specifications
- Detailed implementation steps
- Code patterns and examples
- Testing requirements
- Risk assessments

### 2. Claude Code Issue Seeder

**Script**: `.claude/scripts/seed-issues.ts`

```typescript
/**
 * Claude Code Issue Seeder
 * Reads .claude/ docs and creates/syncs GitHub/Linear issues
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { Octokit } from '@octokit/rest';
import { LinearClient } from '@linear/sdk';

interface TaskDefinition {
  id: string;
  title: string;
  phase: string;
  description: string;
  dependencies: string[];
  files: string[];
  estimateHours: number;
  status: 'pending' | 'in-progress' | 'done';
}

class IssueSeeder {
  private claude: Anthropic;
  private github: Octokit;
  private linear: LinearClient;

  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.github = new Octokit({ auth: process.env.GITHUB_TOKEN });
    this.linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
  }

  async parseSourceDocs(): Promise<TaskDefinition[]> {
    // Use Claude to parse PROGRESS.md and roadmap
    const progressContent = await fs.readFile('.claude/PROGRESS.md', 'utf-8');
    const roadmapContent = await fs.readFile('.claude/implementation-roadmap.md', 'utf-8');

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: `Parse these project docs and extract structured task definitions:

PROGRESS.md:
${progressContent}

ROADMAP.md:
${roadmapContent}

Return JSON array of tasks with: id, title, phase, description, dependencies, files, estimateHours, status`
      }]
    });

    return JSON.parse(response.content[0].text);
  }

  async seedGitHubIssue(task: TaskDefinition): Promise<number> {
    const issue = await this.github.issues.create({
      owner: 'alldigitalrewards',
      repo: 'changemaker-minimal',
      title: `Task ${task.id}: ${task.title}`,
      body: this.generateGitHubIssueBody(task),
      labels: [task.phase, 'manager-role', `status:${task.status}`]
    });

    return issue.data.number;
  }

  async seedLinearIssue(task: TaskDefinition): Promise<string> {
    const issue = await this.linear.createIssue({
      teamId: process.env.LINEAR_TEAM_ID!,
      title: `Task ${task.id}: ${task.title}`,
      description: this.generateLinearIssueBody(task),
      priority: this.calculatePriority(task),
      estimate: task.estimateHours,
      labelIds: await this.getLinearLabels(task.phase)
    });

    return issue.issue.identifier;
  }

  async syncWorkflowJson(tasks: TaskDefinition[], githubIssues: Map<string, number>, linearIssues: Map<string, string>) {
    const workflow = {
      version: '1.0.0',
      lastSync: new Date().toISOString(),
      projects: {
        'manager-role': {
          phases: this.groupByPhase(tasks).map(phase => ({
            id: phase.id,
            name: phase.name,
            tasks: phase.tasks.map(task => ({
              id: task.id,
              title: task.title,
              status: task.status,
              githubIssue: githubIssues.get(task.id),
              linearIssue: linearIssues.get(task.id),
              files: task.files,
              dependencies: task.dependencies,
              estimateHours: task.estimateHours
            }))
          }))
        }
      }
    };

    await fs.writeFile('.claude/workflow.json', JSON.stringify(workflow, null, 2));
  }

  async run() {
    console.log('🚀 Starting issue seeding...');

    // Step 1: Parse source docs with Claude
    const tasks = await this.parseSourceDocs();
    console.log(`📋 Parsed ${tasks.length} tasks from .claude/ docs`);

    // Step 2: Create GitHub issues
    const githubIssues = new Map<string, number>();
    for (const task of tasks) {
      const issueNumber = await this.seedGitHubIssue(task);
      githubIssues.set(task.id, issueNumber);
      console.log(`✓ GitHub issue #${issueNumber} created for Task ${task.id}`);
    }

    // Step 3: Create Linear issues
    const linearIssues = new Map<string, string>();
    for (const task of tasks) {
      const issueId = await this.seedLinearIssue(task);
      linearIssues.set(task.id, issueId);
      console.log(`✓ Linear issue ${issueId} created for Task ${task.id}`);
    }

    // Step 4: Update workflow.json
    await this.syncWorkflowJson(tasks, githubIssues, linearIssues);
    console.log('✓ workflow.json updated');

    console.log('✅ Issue seeding complete!');
  }
}

// CLI execution
if (require.main === module) {
  new IssueSeeder().run().catch(console.error);
}
```

### 3. GitHub Actions CI/CD Workflow

**`.github/workflows/issue-sync.yml`**

```yaml
name: Issue Sync on Merge

on:
  push:
    branches:
      - main
      - staging
      - 'feature/**'

jobs:
  sync-issues:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Get previous commit for diff

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Detect .claude/ file changes
        id: detect-changes
        run: |
          CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD | grep '^\.claude/' || true)
          echo "changed_files<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGED_FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

          if [ -n "$CHANGED_FILES" ]; then
            echo "has_changes=true" >> $GITHUB_OUTPUT
          else
            echo "has_changes=false" >> $GITHUB_OUTPUT
          fi

      - name: Get file diffs
        if: steps.detect-changes.outputs.has_changes == 'true'
        id: get-diffs
        run: |
          DIFF_OUTPUT=$(git diff HEAD~1 HEAD -- .claude/)
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          echo "$DIFF_OUTPUT" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Analyze changes with Claude
        if: steps.detect-changes.outputs.has_changes == 'true'
        id: analyze-changes
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Call Claude to analyze the diff and determine which issues to update
          node .claude/scripts/analyze-changes.js \
            --diff "${{ steps.get-diffs.outputs.diff }}" \
            --branch "${{ github.ref_name }}" \
            --commit "${{ github.sha }}"

      - name: Update GitHub issues
        if: steps.analyze-changes.outputs.issues_to_update != ''
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Update issues based on Claude's analysis
          node .claude/scripts/update-github-issues.js \
            --issues "${{ steps.analyze-changes.outputs.issues_to_update }}" \
            --status "${{ steps.analyze-changes.outputs.new_status }}"

      - name: Update Linear issues
        if: steps.analyze-changes.outputs.issues_to_update != ''
        env:
          LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
        run: |
          # Sync Linear with same updates
          node .claude/scripts/update-linear-issues.js \
            --issues "${{ steps.analyze-changes.outputs.issues_to_update }}" \
            --status "${{ steps.analyze-changes.outputs.new_status }}"

      - name: Auto-close completed tasks
        if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # On merge to main/staging, auto-close completed tasks
          node .claude/scripts/auto-close-issues.js \
            --branch "${{ github.ref_name }}"

      - name: Post summary comment
        if: steps.detect-changes.outputs.has_changes == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const summary = `## 🤖 Issue Sync Summary

            **Branch**: ${{ github.ref_name }}
            **Commit**: ${{ github.sha }}

            **Changed files**:
            ${{ steps.detect-changes.outputs.changed_files }}

            **Issues updated**: ${{ steps.analyze-changes.outputs.issues_to_update || 'None' }}
            **New status**: ${{ steps.analyze-changes.outputs.new_status || 'N/A' }}

            ---
            *Automated by Claude Code Issue Sync*`;

            github.rest.repos.createCommitComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
              body: summary
            });
```

### 4. Claude Change Analyzer

**`.claude/scripts/analyze-changes.js`**

```javascript
#!/usr/bin/env node

/**
 * Analyzes .claude/ file diffs and determines which issues to update
 * Uses Claude API to intelligently parse changes
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;

async function analyzeChanges(diff, branch, commit) {
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Read workflow.json for current issue mappings
  const workflow = JSON.parse(await fs.readFile('.claude/workflow.json', 'utf-8'));

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `Analyze this git diff of .claude/ documentation files and determine which issues should be updated:

DIFF:
${diff}

CURRENT WORKFLOW:
${JSON.stringify(workflow, null, 2)}

BRANCH: ${branch}
COMMIT: ${commit}

Instructions:
1. Identify which tasks were modified (based on PROGRESS.md or roadmap changes)
2. Determine the new status for each task (pending/in-progress/done)
3. Check if any tasks should be closed (status changed to 'done' and branch is main/staging)
4. Return JSON with:
   - issues_to_update: array of GitHub issue numbers
   - new_status: the status to set
   - close_issues: array of issue numbers to close
   - comment: summary comment to post

Only return the JSON, no other text.`
    }]
  });

  const analysis = JSON.parse(response.content[0].text);

  // Output for GitHub Actions
  console.log(`::set-output name=issues_to_update::${analysis.issues_to_update.join(',')}`);
  console.log(`::set-output name=new_status::${analysis.new_status}`);
  console.log(`::set-output name=close_issues::${analysis.close_issues.join(',')}`);
  console.log(`::set-output name=comment::${analysis.comment}`);

  return analysis;
}

// CLI execution
const args = require('minimist')(process.argv.slice(2));
analyzeChanges(args.diff, args.branch, args.commit).catch(console.error);
```

## Usage Guide

### Initial Seeding

```bash
# 1. Ensure .claude/ docs are up to date
# PROGRESS.md, implementation-roadmap.md should be current

# 2. Run the seeder
pnpm tsx .claude/scripts/seed-issues.ts

# 3. Verify workflow.json was created
cat .claude/workflow.json

# 4. Commit the workflow.json
git add .claude/workflow.json
git commit -m "chore: seed issue tracking workflow"
git push
```

### Ongoing Updates

**Manual update via Claude Code**:
```bash
# Update PROGRESS.md or roadmap with changes
# Then run sync:
pnpm tsx .claude/scripts/sync-issues.ts
```

**Automatic update on merge**:
- Push to any branch
- GitHub Actions detects `.claude/` changes
- Claude analyzes diffs
- Issues auto-update
- On merge to main/staging, completed tasks auto-close

### Configuration

**Required Secrets** (GitHub Settings → Secrets):
- `ANTHROPIC_API_KEY` - Claude API key
- `GITHUB_TOKEN` - Auto-provided by GitHub Actions
- `LINEAR_API_KEY` - Linear.app API key
- `LINEAR_TEAM_ID` - Your Linear team ID

**Environment Variables** (`.env.local` for local runs):
```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
LINEAR_API_KEY=lin_api_...
LINEAR_TEAM_ID=team_abc123
```

## Workflow Scenarios

### Scenario 1: Starting New Feature Branch

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Update PROGRESS.md with new tasks
# Mark relevant tasks as "in-progress"

# 3. Push
git push origin feature/new-feature
# → GitHub Action runs
# → Claude detects status changes
# → Issues updated to "in-progress"
# → Comment posted on commit
```

### Scenario 2: Merging to Staging

```bash
# 1. Complete work on feature branch
# Update PROGRESS.md: mark tasks as "done"

# 2. Create PR to staging
gh pr create --base staging --head feature/new-feature

# 3. Merge PR
gh pr merge --squash
# → GitHub Action runs on staging push
# → Claude detects completed tasks
# → Issues updated to "done" (not closed yet)
```

### Scenario 3: Production Release

```bash
# 1. Merge staging to main
gh pr create --base main --head staging
gh pr merge --merge

# 2. GitHub Action runs on main push
# → Claude detects tasks marked "done"
# → Issues automatically CLOSED
# → Linear issues moved to "Done" column
# → Release comment posted
```

## Advanced Features

### Custom Issue Templates

Modify `.claude/scripts/seed-issues.ts` to customize issue bodies:

```typescript
generateGitHubIssueBody(task: TaskDefinition): string {
  return `## 📋 Task ${task.id}: ${task.title}

### Description
${task.description}

### Phase
${task.phase}

### Dependencies
${task.dependencies.map(d => `- #${d}`).join('\n') || 'None'}

### Files to Modify
${task.files.map(f => `- \`${f}\`'`).join('\n')}

### Time Estimate
${task.estimateHours} hours

### Acceptance Criteria
- [ ] Implementation complete
- [ ] Tests added
- [ ] Documentation updated
- [ ] Code reviewed

---
*Auto-generated from .claude/PROGRESS.md*
*Last sync: ${new Date().toISOString()}*`;
}
```

### Bidirectional Sync

To sync changes FROM GitHub/Linear back to `.claude/` docs:

**`.claude/scripts/sync-from-issues.ts`**

```typescript
/**
 * Reads GitHub/Linear issues and updates .claude/ docs
 * Useful for manual issue updates that should be reflected in source docs
 */

async syncFromIssues() {
  const workflow = JSON.parse(await fs.readFile('.claude/workflow.json', 'utf-8'));

  // Fetch all GitHub issues
  const githubIssues = await this.github.issues.listForRepo({
    owner: 'alldigitalrewards',
    repo: 'changemaker-minimal',
    labels: 'manager-role',
    state: 'all'
  });

  // Build status map
  const statusUpdates = new Map<string, string>();
  for (const issue of githubIssues.data) {
    const taskId = this.extractTaskId(issue.title);
    const status = issue.state === 'closed' ? 'done' :
                   issue.labels.find(l => l.name.startsWith('status:'))?.name.split(':')[1] || 'pending';
    statusUpdates.set(taskId, status);
  }

  // Update PROGRESS.md with Claude
  const progressContent = await fs.readFile('.claude/PROGRESS.md', 'utf-8');

  const response = await this.claude.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `Update the status of tasks in this PROGRESS.md based on GitHub issue states:

CURRENT PROGRESS.MD:
${progressContent}

STATUS UPDATES:
${JSON.stringify(Object.fromEntries(statusUpdates), null, 2)}

Return the updated PROGRESS.md with task statuses synced. Preserve all formatting.`
    }]
  });

  await fs.writeFile('.claude/PROGRESS.md', response.content[0].text);
  console.log('✓ PROGRESS.md synced from GitHub issues');
}
```

## Best Practices

1. **Single Source of Truth**: `.claude/` docs are authoritative - never edit workflow.json manually
2. **Atomic Updates**: Update PROGRESS.md in same commit as code changes
3. **Clear Task IDs**: Use consistent task numbering (1, 1.1, 1.2, 2, 2.1, etc.)
4. **Status Discipline**: Only use defined statuses (pending/in-progress/done)
5. **Dependency Tracking**: Keep dependencies list updated in PROGRESS.md
6. **Regular Syncs**: Run manual sync weekly to catch any drift

## Troubleshooting

### Issue: Workflow.json out of sync

```bash
# Re-seed from source docs
pnpm tsx .claude/scripts/seed-issues.ts

# Or sync from issues back to docs
pnpm tsx .claude/scripts/sync-from-issues.ts
```

### Issue: GitHub Action fails

```bash
# Check logs in GitHub Actions tab
# Common issues:
# - Missing ANTHROPIC_API_KEY secret
# - Invalid .claude/workflow.json format
# - Claude API rate limit

# Test locally:
node .claude/scripts/analyze-changes.js \
  --diff "$(git diff HEAD~1 -- .claude/)" \
  --branch "$(git branch --show-current)" \
  --commit "$(git rev-parse HEAD)"
```

### Issue: Duplicate issues created

```bash
# workflow.json tracks issue numbers to prevent duplicates
# If corrupted, delete and re-seed:
rm .claude/workflow.json
pnpm tsx .claude/scripts/seed-issues.ts
```

## Roadmap

- [ ] Implement bidirectional sync (GitHub → .claude/)
- [ ] Add Slack notifications on issue updates
- [ ] Support for sub-issues and task hierarchies
- [ ] Time tracking integration (Toggl/Harvest)
- [ ] Burndown chart generation from workflow.json
- [ ] AI-powered task estimation refinement
- [ ] Automatic dependency detection from code analysis

---

**Last Updated**: 2025-10-27
**Version**: 1.0.0
**Maintainer**: Jack Felke (@TerminalGravity)
