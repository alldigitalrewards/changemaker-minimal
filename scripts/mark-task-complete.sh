#!/bin/bash

# Mark a task as complete in .claude/PROGRESS.md
# Usage: ./scripts/mark-task-complete.sh [TASK_NUMBER]
#
# Example:
#   ./scripts/mark-task-complete.sh 1
#   Marks Task 1 as complete

set -e

TASK_NUM=$1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate input
if [ -z "$TASK_NUM" ]; then
  echo -e "${RED}Error: Task number required${NC}"
  echo ""
  echo "Usage: ./scripts/mark-task-complete.sh [TASK_NUMBER]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/mark-task-complete.sh 1    # Mark Task 1 as complete"
  echo "  ./scripts/mark-task-complete.sh 16   # Mark Task 16 as complete"
  exit 1
fi

# Validate PROGRESS.md exists
if [ ! -f ".claude/PROGRESS.md" ]; then
  echo -e "${RED}Error: .claude/PROGRESS.md not found${NC}"
  echo "Are you in the project root directory?"
  exit 1
fi

# Check if task is already marked complete
if grep -q "\[x\] \*\*Task $TASK_NUM\*\*.*✅" .claude/PROGRESS.md; then
  echo -e "${YELLOW}Task $TASK_NUM is already marked as complete${NC}"
  exit 0
fi

# Check if task exists
if ! grep -q "\[ \] \*\*Task $TASK_NUM\*\*" .claude/PROGRESS.md; then
  echo -e "${RED}Error: Task $TASK_NUM not found in PROGRESS.md${NC}"
  echo ""
  echo "Available tasks:"
  grep -n "\[ \] \*\*Task" .claude/PROGRESS.md | head -10
  exit 1
fi

# Backup PROGRESS.md
cp .claude/PROGRESS.md .claude/PROGRESS.md.backup

# Mark task as complete
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s/\[ \] \*\*Task $TASK_NUM\*\*/\[x\] \*\*Task $TASK_NUM\*\* ✅/" .claude/PROGRESS.md
else
  # Linux
  sed -i "s/\[ \] \*\*Task $TASK_NUM\*\*/\[x\] \*\*Task $TASK_NUM\*\* ✅/" .claude/PROGRESS.md
fi

# Get task name
TASK_NAME=$(grep "Task $TASK_NUM\*\*:" .claude/PROGRESS.md | sed 's/.*\*\*: //' | sed 's/ ⏱️.*//')

echo ""
echo -e "${GREEN}✅ Task $TASK_NUM marked as complete in .claude/PROGRESS.md${NC}"
echo ""
echo "Task: $TASK_NAME"
echo ""
echo "Next steps:"
echo "  1. Review changes:"
echo -e "     ${YELLOW}git diff .claude/PROGRESS.md${NC}"
echo ""
echo "  2. Update daily standup notes (manual):"
echo "     - Add 'Task $TASK_NUM ✅' to today's Completed section"
echo "     - Update Hours Logged"
echo "     - Update Tomorrow section with next task"
echo ""
echo "  3. Commit progress:"
echo -e "     ${YELLOW}git add .claude/PROGRESS.md${NC}"
echo -e "     ${YELLOW}git commit -m \"progress: complete Task $TASK_NUM - ${TASK_NAME,,}\"${NC}"
echo ""
echo "  4. Push to remote:"
echo -e "     ${YELLOW}git push${NC}"
echo ""

# Show diff
echo "Changes made:"
echo "---"
diff .claude/PROGRESS.md.backup .claude/PROGRESS.md || true
echo "---"
echo ""

# Clean up backup
rm .claude/PROGRESS.md.backup

# Ask if user wants to commit now
read -p "Commit progress update now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git add .claude/PROGRESS.md
  git commit -m "progress: complete Task $TASK_NUM - ${TASK_NAME,,}"
  echo ""
  echo -e "${GREEN}Progress committed! Don't forget to update daily standup notes.${NC}"
fi
