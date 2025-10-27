#!/usr/bin/env tsx

/**
 * Task Master ↔ Linear Sync Script
 *
 * Synchronizes Task Master tasks with Linear issues for team visibility.
 * See .taskmaster/docs/LINEAR_SYNC_STRATEGY.md for full documentation.
 */

import { LinearClient } from '@linear/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Configuration
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_TEAM_ID = 'afb2af24-c013-4872-979f-ffec28daef3d'; // ADR Product Team
const LINEAR_PROJECT_ID = '4d9bf4fd-8055-4dc7-8316-3b3f22931208'; // Changemaker App

const TASKMASTER_TASKS_PATH = '.taskmaster/tasks/tasks.json';
const SYNC_MAPPINGS_PATH = '.taskmaster/sync-mappings.json';
const SYNC_LOG_PATH = '.taskmaster/logs/sync.log';

// Types
interface TaskMasterTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'deferred' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  dependencies?: string[];
  details?: string;
  testStrategy?: string;
  subtasks?: TaskMasterSubtask[];
}

interface TaskMasterSubtask {
  id: string;
  title: string;
  description?: string;
  status: string;
  details?: string;
}

interface SyncMapping {
  linearIssueId: string;
  linearIdentifier: string;
  lastSyncedAt: string;
  lastSyncedStatus: string;
  subtasksSynced: string[];
}

interface SyncMappings {
  mappings: Record<string, SyncMapping>;
  unmappedLinearIssues: string[];
  unmappedTaskMasterTasks: string[];
}

// Utilities
class Logger {
  static log(level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', message: string) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logMessage = `${timestamp} - [${level}] ${message}`;
    console.log(logMessage);

    // Append to log file
    try {
      const logPath = join(process.cwd(), SYNC_LOG_PATH);
      const logDir = join(process.cwd(), '.taskmaster/logs');

      if (!existsSync(logDir)) {
        require('fs').mkdirSync(logDir, { recursive: true });
      }

      writeFileSync(logPath, logMessage + '\n', { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}

// Status mapping
function mapTaskMasterToLinearStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Backlog',
    'in-progress': 'In Progress',
    'done': 'Done',
    'blocked': 'Blocked',
    'deferred': 'Backlog',
    'cancelled': 'Canceled'
  };
  return statusMap[status] || 'Backlog';
}

function mapLinearToTaskMasterStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Backlog': 'pending',
    'Todo': 'pending',
    'In Progress': 'in-progress',
    'Done': 'done',
    'Blocked': 'blocked',
    'Canceled': 'cancelled'
  };
  return statusMap[status] || 'pending';
}

// Priority mapping
function mapTaskMasterPriority(priority?: string): number {
  const priorityMap: Record<string, number> = {
    'high': 1,    // Urgent
    'medium': 2,  // High
    'low': 4      // Low
  };
  return priorityMap[priority || 'medium'] || 2;
}

// Load Task Master tasks
function loadTaskMasterTasks(): TaskMasterTask[] {
  const tasksPath = join(process.cwd(), TASKMASTER_TASKS_PATH);
  const tasksData = readFileSync(tasksPath, 'utf-8');
  const data = JSON.parse(tasksData);
  return data.tasks || [];
}

// Load sync mappings
function loadSyncMappings(): SyncMappings {
  const mappingsPath = join(process.cwd(), SYNC_MAPPINGS_PATH);

  if (!existsSync(mappingsPath)) {
    return {
      mappings: {},
      unmappedLinearIssues: [],
      unmappedTaskMasterTasks: []
    };
  }

  const mappingsData = readFileSync(mappingsPath, 'utf-8');
  return JSON.parse(mappingsData);
}

// Save sync mappings
function saveSyncMappings(mappings: SyncMappings) {
  const mappingsPath = join(process.cwd(), SYNC_MAPPINGS_PATH);
  writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
}

// Format task description for Linear
function formatLinearDescription(task: TaskMasterTask): string {
  const completedSubtasks = task.subtasks?.filter(st => st.status === 'done') || [];
  const pendingSubtasks = task.subtasks?.filter(st => st.status !== 'done') || [];
  const totalSubtasks = task.subtasks?.length || 0;

  let description = `## Overview\n${task.description}\n\n`;

  if (task.details) {
    description += `## Implementation Details\n${task.details}\n\n`;
  }

  if (totalSubtasks > 0) {
    description += `## Progress Tracking\n`;
    description += `- Total Subtasks: ${totalSubtasks}\n`;
    description += `- Completed: ${completedSubtasks.length}\n`;
    description += `- Pending: ${pendingSubtasks.length}\n\n`;

    if (completedSubtasks.length > 0) {
      description += `### Completed Subtasks\n`;
      completedSubtasks.forEach(st => {
        description += `- [x] ${st.title}\n`;
      });
      description += '\n';
    }

    if (pendingSubtasks.length > 0) {
      description += `### Pending Subtasks\n`;
      pendingSubtasks.forEach(st => {
        description += `- [ ] ${st.title}\n`;
      });
      description += '\n';
    }
  }

  if (task.dependencies && task.dependencies.length > 0) {
    description += `## Dependencies\n`;
    task.dependencies.forEach(dep => {
      description += `- Task #${dep}\n`;
    });
    description += '\n';
  }

  if (task.testStrategy) {
    description += `## Test Strategy\n${task.testStrategy}\n\n`;
  }

  description += `---\n*🤖 Auto-synced from Task Master on ${new Date().toISOString()}*`;

  return description;
}

// Format subtask completion comment
function formatSubtaskCompletion(subtask: TaskMasterSubtask): string {
  let comment = `✅ **Subtask ${subtask.id} completed**: ${subtask.title}\n\n`;

  if (subtask.details) {
    comment += `**Implementation Notes:**\n${subtask.details}\n`;
  }

  return comment;
}

// Main sync class
class LinearSync {
  private linear: LinearClient;
  private mappings: SyncMappings;
  private dryRun: boolean;

  constructor(dryRun = false) {
    if (!LINEAR_API_KEY) {
      throw new Error('LINEAR_API_KEY environment variable is required');
    }

    this.linear = new LinearClient({ apiKey: LINEAR_API_KEY });
    this.mappings = loadSyncMappings();
    this.dryRun = dryRun;

    Logger.log('INFO', `Starting sync operation (dry-run: ${dryRun})`);
  }

  async syncAll() {
    const tasks = loadTaskMasterTasks();
    Logger.log('INFO', `Found ${tasks.length} Task Master tasks`);

    for (const task of tasks) {
      await this.syncTask(task);
    }

    if (!this.dryRun) {
      saveSyncMappings(this.mappings);
    }

    Logger.log('INFO', 'Sync completed successfully');
  }

  async syncTask(task: TaskMasterTask) {
    const mapping = this.mappings.mappings[task.id];

    if (!mapping) {
      Logger.log('WARNING', `No Linear mapping for Task ${task.id}: "${task.title}"`);

      if (!this.mappings.unmappedTaskMasterTasks.includes(task.id)) {
        this.mappings.unmappedTaskMasterTasks.push(task.id);
      }

      // Could auto-create Linear issue here if desired
      return;
    }

    try {
      await this.updateLinearIssue(task, mapping);
    } catch (error) {
      Logger.log('ERROR', `Failed to sync Task ${task.id}: ${error}`);
    }
  }

  async updateLinearIssue(task: TaskMasterTask, mapping: SyncMapping) {
    const issue = await this.linear.issue(mapping.linearIssueId);

    if (!issue) {
      Logger.log('ERROR', `Linear issue ${mapping.linearIdentifier} not found`);
      return;
    }

    const changes: string[] = [];

    // Update status if changed
    if (task.status !== mapping.lastSyncedStatus) {
      const linearStatus = mapTaskMasterToLinearStatus(task.status);

      if (this.dryRun) {
        Logger.log('INFO', `[DRY RUN] Would update ${mapping.linearIdentifier} status: ${mapping.lastSyncedStatus} → ${task.status}`);
      } else {
        const states = await this.linear.workflowStates({
          filter: {
            team: { id: { eq: LINEAR_TEAM_ID } },
            name: { eq: linearStatus }
          }
        });

        if (states.nodes.length > 0) {
          await issue.update({ stateId: states.nodes[0].id });
          Logger.log('SUCCESS', `Updated ${mapping.linearIdentifier} status: ${mapping.lastSyncedStatus} → ${task.status}`);
          changes.push('status');
        }
      }
    }

    // Add comments for newly completed subtasks
    if (task.subtasks) {
      const newlyCompletedSubtasks = task.subtasks.filter(
        st => st.status === 'done' && !mapping.subtasksSynced.includes(st.id)
      );

      for (const subtask of newlyCompletedSubtasks) {
        if (this.dryRun) {
          Logger.log('INFO', `[DRY RUN] Would add comment to ${mapping.linearIdentifier}: Subtask ${subtask.id} completed`);
        } else {
          await this.linear.commentCreate({
            issueId: mapping.linearIssueId,
            body: formatSubtaskCompletion(subtask)
          });

          Logger.log('SUCCESS', `Added comment to ${mapping.linearIdentifier}: Subtask ${subtask.id} completed`);
          mapping.subtasksSynced.push(subtask.id);
          changes.push(`subtask-${subtask.id}`);
        }
      }
    }

    // Update description with latest progress
    if (changes.length > 0) {
      if (this.dryRun) {
        Logger.log('INFO', `[DRY RUN] Would update ${mapping.linearIdentifier} description`);
      } else {
        await issue.update({
          description: formatLinearDescription(task)
        });

        Logger.log('SUCCESS', `Updated ${mapping.linearIdentifier} description`);
      }
    }

    // Update mapping metadata
    if (!this.dryRun && changes.length > 0) {
      mapping.lastSyncedAt = new Date().toISOString();
      mapping.lastSyncedStatus = task.status;
    }
  }

  async initializeMapping() {
    Logger.log('INFO', 'Initializing mappings between Task Master and Linear');

    const tasks = loadTaskMasterTasks();
    const linearIssues = await this.linear.issues({
      filter: {
        project: { id: { eq: LINEAR_PROJECT_ID } }
      }
    });

    Logger.log('INFO', `Found ${linearIssues.nodes.length} Linear issues in Changemaker App project`);

    // Auto-map based on similar titles
    for (const task of tasks) {
      if (this.mappings.mappings[task.id]) {
        continue; // Already mapped
      }

      // Try to find matching Linear issue
      const matchingIssue = linearIssues.nodes.find(issue => {
        const titleSimilarity = this.calculateSimilarity(
          task.title.toLowerCase(),
          issue.title.toLowerCase()
        );
        return titleSimilarity > 0.7;
      });

      if (matchingIssue) {
        Logger.log('INFO', `Auto-mapped Task ${task.id} → ${matchingIssue.identifier}: "${task.title}"`);

        this.mappings.mappings[task.id] = {
          linearIssueId: matchingIssue.id,
          linearIdentifier: matchingIssue.identifier,
          lastSyncedAt: new Date().toISOString(),
          lastSyncedStatus: task.status,
          subtasksSynced: []
        };
      } else {
        if (!this.mappings.unmappedTaskMasterTasks.includes(task.id)) {
          this.mappings.unmappedTaskMasterTasks.push(task.id);
        }
        Logger.log('WARNING', `No match found for Task ${task.id}: "${task.title}"`);
      }
    }

    // Identify unmapped Linear issues
    for (const issue of linearIssues.nodes) {
      const isMapped = Object.values(this.mappings.mappings).some(
        m => m.linearIssueId === issue.id
      );

      if (!isMapped && !this.mappings.unmappedLinearIssues.includes(issue.id)) {
        this.mappings.unmappedLinearIssues.push(issue.id);
        Logger.log('WARNING', `Unmapped Linear issue: ${issue.identifier} - "${issue.title}"`);
      }
    }

    if (!this.dryRun) {
      saveSyncMappings(this.mappings);
    }

    Logger.log('INFO', 'Mapping initialization complete');
  }

  // Simple string similarity calculation (Levenshtein distance)
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async generateReport() {
    const tasks = loadTaskMasterTasks();
    const mappedCount = Object.keys(this.mappings.mappings).length;
    const unmappedTasksCount = this.mappings.unmappedTaskMasterTasks.length;
    const unmappedIssuesCount = this.mappings.unmappedLinearIssues.length;

    console.log('\n=== Task Master ↔ Linear Sync Report ===\n');
    console.log(`Total Task Master Tasks: ${tasks.length}`);
    console.log(`Mapped Tasks: ${mappedCount}`);
    console.log(`Unmapped Tasks: ${unmappedTasksCount}`);
    console.log(`Unmapped Linear Issues: ${unmappedIssuesCount}\n`);

    if (unmappedTasksCount > 0) {
      console.log('Unmapped Task Master Tasks:');
      for (const taskId of this.mappings.unmappedTaskMasterTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          console.log(`  - Task ${taskId}: "${task.title}"`);
        }
      }
      console.log('');
    }

    if (unmappedIssuesCount > 0) {
      console.log('Unmapped Linear Issues:');
      const linearIssues = await this.linear.issues({
        filter: {
          id: { in: this.mappings.unmappedLinearIssues }
        }
      });

      for (const issue of linearIssues.nodes) {
        console.log(`  - ${issue.identifier}: "${issue.title}"`);
      }
      console.log('');
    }

    console.log('Sync Mappings:');
    for (const [taskId, mapping] of Object.entries(this.mappings.mappings)) {
      const task = tasks.find(t => t.id === taskId);
      console.log(`  - Task ${taskId} ↔ ${mapping.linearIdentifier}`);
      if (task) {
        console.log(`    Title: "${task.title}"`);
        console.log(`    Status: ${task.status} (last synced: ${mapping.lastSyncedStatus})`);
        console.log(`    Last Sync: ${mapping.lastSyncedAt}`);
      }
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const init = args.includes('--init');
  const report = args.includes('--report');

  try {
    const sync = new LinearSync(dryRun);

    if (init) {
      await sync.initializeMapping();
    } else if (report) {
      await sync.generateReport();
    } else {
      await sync.syncAll();
    }
  } catch (error) {
    Logger.log('ERROR', `Sync failed: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
