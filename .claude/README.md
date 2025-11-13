# Claude Code Configuration

This directory contains Claude Code configuration for the Changemaker project.

## Structure

```
.claude/
├── README.md                    # This file
├── settings.local.json          # User-specific permissions & MCP servers
├── memory/                      # Project knowledge base
├── agents/                      # Custom agent definitions
├── commands/                    # Custom slash commands
└── archive/                     # Historical files (reference only)
```

## Active Configuration

- **Main context:** `/CLAUDE.md` (project root)
- **Task Master:** `/.taskmaster/CLAUDE.md`
- **MCP servers:** `/.mcp.json`

## Maintenance

- Keep memory files current (5-10 max)
- Archive outdated sessions/plans
- Update CLAUDE.md when patterns change
- Don't duplicate Task Master documentation

## Guidelines

1. **Before adding files:** Is this essential context?
2. **Before creating agents:** Will this be reused 3+ times?
3. **Before documenting:** Does this belong in CLAUDE.md instead?

Target: 20-30 active files, rest archived.
