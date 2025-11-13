# Task Master Audit & Sync System

## Overview

Comprehensive Python-based system to audit Task Master task statuses against actual codebase implementation, preventing dependency blocking from stale task states.

## Problem Statement

Task Master maintains task status separately from codebase implementation. This creates synchronization issues where:
- Tasks marked "pending" may actually be complete in the codebase
- Incorrectly marked tasks block dependent tasks
- Manual status tracking is error-prone and time-consuming

## Solution Architecture

Hybrid approach combining pattern matching (fast, free) with LLM analysis (expensive, accurate) for cost-effective audit and sync.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Audit Workflow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Load Tasks           2. Scan Codebase    3. Pattern Match  │
│  ┌──────────┐           ┌──────────┐        ┌──────────┐      │
│  │ Task     │──────────>│ Git      │───────>│ Regex    │      │
│  │ Master   │           │ History  │        │ Patterns │      │
│  │ tasks.   │           │ Scanner  │        │          │      │
│  │ json     │           │          │        │          │      │
│  └──────────┘           └──────────┘        └──────────┘      │
│                                                   │             │
│                                                   v             │
│  4. Confidence Check    5. LLM Analysis (if LOW) │             │
│  ┌──────────┐           ┌──────────┐            │             │
│  │ HIGH/    │<──────────│ Pydantic │<───────────┘             │
│  │ CERTAIN? │           │ AI +     │   (20-30% of tasks)      │
│  │          │           │ Claude   │                           │
│  └──────────┘           └──────────┘                           │
│       │                                                         │
│       v                                                         │
│  6. Generate Report      7. Interactive Review                 │
│  ┌──────────┐           ┌──────────┐                          │
│  │ Audit    │──────────>│ Rich CLI │                          │
│  │ Report   │           │ Review   │                          │
│  │ JSON     │           │ UI       │                          │
│  └──────────┘           └──────────┘                          │
│                                │                                │
│                                v                                │
│  8. Apply Changes        9. Backup & Rollback                  │
│  ┌──────────┐           ┌──────────┐                          │
│  │ Task     │<──────────│ tasks.   │                          │
│  │ Master   │           │ json     │                          │
│  │ CLI      │           │ backup   │                          │
│  └──────────┘           └──────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models (Pydantic v2)

### Core Enums

```python
class TaskStatus(str, Enum):
    """Task Master status values"""
    pending = "pending"
    in_progress = "in-progress"
    done = "done"
    deferred = "deferred"
    cancelled = "cancelled"
    blocked = "blocked"

class ConfidenceLevel(str, Enum):
    """Confidence in status detection"""
    CERTAIN = "certain"      # 95%+ confidence
    HIGH = "high"            # 80-95%
    MEDIUM = "medium"        # 60-80%
    LOW = "low"              # 40-60%
    UNCERTAIN = "uncertain"  # <40%

class EvidenceType(str, Enum):
    """Types of evidence for task completion"""
    git_commit = "git_commit"
    file_created = "file_created"
    file_modified = "file_modified"
    api_endpoint_created = "api_endpoint_created"
    ui_component_created = "ui_component_created"
    test_file_created = "test_file_created"
    documentation_added = "documentation_added"
    migration_created = "migration_created"
    llm_analysis = "llm_analysis"
```

### Evidence Model

```python
class Evidence(BaseModel):
    """Single piece of evidence for task completion"""
    type: EvidenceType
    description: str
    timestamp: datetime
    confidence: ConfidenceLevel

    # File information
    file_path: Optional[Path] = None
    lines_added: Optional[int] = None
    lines_deleted: Optional[int] = None

    # Git information
    commit_sha: Optional[str] = None
    commit_message: Optional[str] = None
    author: Optional[str] = None

    # Pattern matching
    matched_patterns: List[str] = Field(default_factory=list)

    # LLM analysis
    llm_reasoning: Optional[str] = None
```

### Task Models

```python
class TaskMasterTask(BaseModel):
    """Task from Task Master tasks.json"""
    id: str
    title: str
    description: str
    status: TaskStatus
    priority: Optional[str] = None
    dependencies: List[str] = Field(default_factory=list)

    @validator('id')
    def validate_id(cls, v):
        """Validate task ID format (e.g., '42', '42.1', '42.1.2')"""
        if not re.match(r'^\d+(\.\d+)*$', v):
            raise ValueError(f"Invalid task ID format: {v}")
        return v

class CodebaseImplementation(BaseModel):
    """Analysis of task implementation in codebase"""
    task_id: str
    current_status: TaskStatus
    detected_status: TaskStatus
    confidence: ConfidenceLevel
    evidence: List[Evidence]
    completeness_score: float = Field(ge=0.0, le=1.0)
    reasoning: str

    @computed_field
    @property
    def has_implementation(self) -> bool:
        return any(e.type in [
            EvidenceType.file_created,
            EvidenceType.api_endpoint_created,
            EvidenceType.ui_component_created
        ] for e in self.evidence)

    @computed_field
    @property
    def has_tests(self) -> bool:
        return any(e.type == EvidenceType.test_file_created for e in self.evidence)

    @computed_field
    @property
    def has_documentation(self) -> bool:
        return any(e.type == EvidenceType.documentation_added for e in self.evidence)
```

### Review Models

```python
class StatusChange(BaseModel):
    """Proposed task status change"""
    task_id: str
    current_status: TaskStatus
    proposed_status: TaskStatus
    confidence: ConfidenceLevel
    evidence_summary: str
    requires_review: bool = True

    # Review tracking
    reviewed_at: Optional[datetime] = None
    approved: Optional[bool] = None
    reviewer_notes: Optional[str] = None

class AuditReport(BaseModel):
    """Complete audit report"""
    scanned_at: datetime
    total_tasks: int
    implementations: List[CodebaseImplementation]
    status_changes: List[StatusChange]
    statistics: dict

    @computed_field
    @property
    def changes_count(self) -> int:
        return len(self.status_changes)

class SyncOperation(BaseModel):
    """Record of sync operation"""
    executed_at: datetime
    changes_applied: List[StatusChange]
    changes_skipped: List[StatusChange]
    success: bool
    rollback_data: Optional[dict] = None
```

## Pattern Matching Engine

### Regex Patterns

```python
class PatternMatcher:
    """Pattern matching for task completion evidence"""

    TASK_REFERENCE_PATTERNS = [
        re.compile(r'task[:\s-]*(\d+(?:\.\d+)?)', re.IGNORECASE),
        re.compile(r'implements[:\s]*#?(\d+)', re.IGNORECASE),
        re.compile(r'closes[:\s]*#?(\d+)', re.IGNORECASE),
        re.compile(r'fixes[:\s]*#?(\d+)', re.IGNORECASE),
        re.compile(r'resolves[:\s]*#?(\d+)', re.IGNORECASE),
    ]

    FILE_PATTERNS = {
        'api_endpoint': [
            r'app/api/.*?/route\.ts$',
            r'pages/api/.*?\.ts$',
        ],
        'ui_component': [
            r'components/.*?\.tsx$',
            r'app/.*?/page\.tsx$',
        ],
        'database_migration': [
            r'prisma/migrations/.*?/migration\.sql$',
            r'supabase/migrations/.*?\.sql$',
        ],
        'test_file': [
            r'tests?/.*?\.spec\.ts$',
            r'.*?\.test\.ts$',
            r'__tests__/.*?\.ts$',
        ],
        'documentation': [
            r'docs?/.*?\.md$',
            r'README.*\.md$',
            r'\.claude/.*?\.md$',
        ],
    }
```

### Codebase Scanner

```python
class CodebaseScanner:
    """Scan git repository for task completion evidence"""

    def __init__(self, repo_path: Path):
        self.repo = git.Repo(repo_path)
        self.pattern_matcher = PatternMatcher()

    def scan_commits(
        self,
        since: str = "HEAD~50",
        until: str = "HEAD"
    ) -> List[Evidence]:
        """Scan git commits for task references"""
        evidence = []

        for commit in self.repo.iter_commits(f"{since}..{until}"):
            # Extract task IDs from commit message
            task_ids = self.pattern_matcher.extract_task_ids(commit.message)

            if task_ids:
                for task_id in task_ids:
                    evidence.append(Evidence(
                        type=EvidenceType.git_commit,
                        description=f"Referenced in commit: {commit.message[:100]}",
                        timestamp=commit.committed_datetime,
                        confidence=ConfidenceLevel.HIGH,
                        commit_sha=commit.hexsha,
                        commit_message=commit.message,
                        author=commit.author.name,
                        matched_patterns=[f"Commit message: {commit.message}"]
                    ))

            # Analyze changed files
            for diff in commit.diff(commit.parents[0] if commit.parents else None):
                file_evidence = self._analyze_file_change(diff, commit)
                if file_evidence:
                    evidence.extend(file_evidence)

        return evidence

    def _analyze_file_change(
        self,
        diff: git.Diff,
        commit: git.Commit
    ) -> List[Evidence]:
        """Analyze individual file change for evidence"""
        evidence = []
        file_path = Path(diff.b_path) if diff.b_path else None

        if not file_path:
            return evidence

        # Detect file type and create appropriate evidence
        for pattern_type, patterns in PatternMatcher.FILE_PATTERNS.items():
            for pattern in patterns:
                if re.match(pattern, str(file_path)):
                    evidence_type = self._map_pattern_to_evidence(pattern_type)
                    evidence.append(Evidence(
                        type=evidence_type,
                        description=f"{pattern_type.replace('_', ' ').title()}: {file_path.name}",
                        timestamp=commit.committed_datetime,
                        confidence=ConfidenceLevel.MEDIUM,
                        file_path=file_path,
                        lines_added=diff.diff.count(b'\n+') if diff.diff else 0,
                        lines_deleted=diff.diff.count(b'\n-') if diff.diff else 0,
                        commit_sha=commit.hexsha,
                        matched_patterns=[pattern]
                    ))

        return evidence
```

## LLM Integration (Pydantic AI)

### LLM Analyzer

```python
from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel

class LLMTaskAnalyzer:
    """LLM-based analysis for ambiguous cases"""

    def __init__(self, api_key: str):
        self.model = AnthropicModel(
            'claude-3-5-sonnet-20241022',
            api_key=api_key
        )

        self.agent = Agent(
            self.model,
            result_type=LLMAnalysisResult,
            system_prompt="""You are a task completion analyzer for software projects.

Analyze evidence from git commits, file changes, and code patterns to determine
if a task has been implemented in the codebase.

Consider:
- Direct task ID references in commits
- Implementation patterns matching task requirements
- Related file changes (API routes, UI components, tests, docs)
- Code quality and completeness
- Test coverage

Return structured analysis with confidence scoring."""
        )

    async def analyze_task(
        self,
        task: TaskMasterTask,
        evidence: List[Evidence],
        codebase_context: str
    ) -> LLMAnalysisResult:
        """Analyze task with LLM for ambiguous cases"""
        prompt = self._build_prompt(task, evidence, codebase_context)
        result = await self.agent.run(prompt)
        return result.data

class LLMAnalysisResult(BaseModel):
    """Structured LLM analysis output"""
    is_implemented: bool
    confidence: ConfidenceLevel
    recommended_status: TaskStatus
    reasoning: str = Field(min_length=50)
    key_evidence: List[str] = Field(min_items=1)
    missing_indicators: List[str] = Field(default_factory=list)
    suggested_next_steps: Optional[str] = None
```

### Cost Optimization

```python
class AuditOrchestrator:
    """Orchestrate hybrid pattern matching + LLM approach"""

    async def audit_task(
        self,
        task: TaskMasterTask,
        use_llm: bool = True
    ) -> CodebaseImplementation:
        """Audit single task with cost optimization"""

        # Step 1: Pattern matching (fast, free)
        evidence = self.scanner.find_evidence_for_task(task)
        initial_impl = self.task_matcher.match_task(task, evidence)

        # Step 2: Only use LLM for MEDIUM/LOW confidence
        if use_llm and initial_impl.confidence in [
            ConfidenceLevel.MEDIUM,
            ConfidenceLevel.LOW
        ]:
            context = self._get_codebase_context(task, evidence)
            llm_result = await self.llm_analyzer.analyze_task(
                task, evidence, context
            )

            # Merge LLM insights
            return self._merge_analysis(initial_impl, llm_result, evidence)

        return initial_impl
```

## Interactive CLI Review

### Rich UI Components

```python
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm

class TaskAuditReviewer:
    """Interactive CLI for reviewing audit results"""

    def review_audit_report(self, report: AuditReport) -> SyncOperation:
        """Interactive review of proposed changes"""

        # Display summary
        self.console.print(Panel.fit(
            f"Total Tasks: {report.total_tasks}\n"
            f"Proposed Changes: {len(report.status_changes)}\n"
            f"Pattern Matched: {report.statistics['pattern_matched']}\n"
            f"LLM Analyzed: {report.statistics['llm_analyzed']}",
            title="Audit Summary"
        ))

        # Review each change
        approved = []
        skipped = []

        for change in report.status_changes:
            # Auto-approve CERTAIN confidence
            if change.confidence == ConfidenceLevel.CERTAIN:
                approved.append(change)
                continue

            # Manual review for lower confidence
            if self._review_change(change):
                approved.append(change)
            else:
                skipped.append(change)

        # Confirm and apply
        if approved and Confirm.ask(f"Apply {len(approved)} changes?"):
            return self._apply_changes(approved, skipped)

        return SyncOperation(
            executed_at=datetime.now(),
            changes_applied=[],
            changes_skipped=skipped,
            success=False
        )
```

## CLI Commands

```bash
# Basic audit (pattern matching only)
python -m taskmaster_audit --mode audit

# Full audit with LLM (for ambiguous cases)
python -m taskmaster_audit --mode audit --use-llm

# Audit with budget control
python -m taskmaster_audit --mode audit --use-llm --max-llm-calls 10

# Auto-approve certain matches
python -m taskmaster_audit --mode audit --auto-approve-certain

# Full sync (audit + apply)
python -m taskmaster_audit --mode sync --use-llm

# Custom git range
python -m taskmaster_audit --since HEAD~100 --until HEAD
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. Set up Python project with Poetry/pip
2. Implement Pydantic data models
3. Implement PatternMatcher
4. Implement CodebaseScanner with GitPython
5. Write unit tests

### Phase 2: Task Matching
1. Implement TaskMatcher with evidence aggregation
2. Implement confidence scoring
3. Add completeness detection
4. Write integration tests

### Phase 3: LLM Integration
1. Set up Pydantic AI
2. Implement LLMTaskAnalyzer
3. Implement AuditOrchestrator
4. Add cost tracking
5. Test with real codebase

### Phase 4: CLI Interface
1. Implement TaskAuditReviewer with Rich
2. Build interactive review
3. Implement backup/rollback
4. Add CLI entry point
5. End-to-end testing

### Phase 5: Task Master Integration
1. Integrate with Task Master CLI
2. Test dependency preservation
3. Add to Task Master MCP server
4. Create documentation
5. Production testing

## Success Metrics

- Pattern matching achieves 70%+ high-confidence matches
- LLM escalation only for 20-30% of tasks
- Zero false positives on CERTAIN confidence level
- Interactive review completes quickly
- Rollback works perfectly if issues detected

## Future Enhancements

1. **Machine Learning**: Train ML model on historical audit data
2. **GitHub Integration**: Pull PR data for additional evidence
3. **CI/CD Integration**: Auto-audit on merge to main
4. **Web UI**: Browser-based review interface
5. **Team Analytics**: Track team velocity and task completion patterns

---

**Status**: Design Complete - Ready for Implementation
**Next Step**: Phase 1 - Core Infrastructure
