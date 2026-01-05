---
description: Generate an acceleration card from completed feature artifacts - extracts reusable patterns, decisions, and runbooks for future development speed.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Extract "acceleration components" from a completed feature that make the next project faster. Output to `cards/[feature-name].card.md`.

Three objectives of acceleration components:
1. **Reproducibility**: New person reaches working state within 30-60 min
2. **Decision cost reduction**: Leave criteria/rationale that prevent repeated debates
3. **Failure cost reduction**: Standardize frequently occurring problems into procedures

## Execution Steps

### 1. Setup

Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse JSON for FEATURE_DIR and AVAILABLE_DOCS.

All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

### 2. Load Artifacts

Read from FEATURE_DIR:
- **Required**: spec.md, plan.md, tasks.md
- **Optional**: research.md, data-model.md, contracts/, checklists/

Also gather:
- Git commit history for this feature branch: `git log --oneline main..HEAD`
- Changed files: `git diff --name-only main..HEAD`
- Any error logs or issue references in commits

### 3. Extract Golden Path

Analyze:
- Phase 1 (Setup) tasks from tasks.md
- Environment setup section from plan.md
- Actual generated file structure

Extract:
- prerequisites: required tools, versions, env vars
- steps: minimal path to working state (target 10-15 min)
- success_check: success verification commands

Rules:
- Present only the "correct path", no option explanations
- Each step includes copy-pasteable commands
- Verification must be objective (command/output), no subjective checks

### 4. Extract Recipes

Analyze:
- Tasks with repeating patterns in tasks.md
- Recurring work types in commit messages
- Extension points in plan.md

Extract (minimum 2-3):
- Add new [entity/module/component] procedure
- Data schema change procedure
- Test addition procedure
- Deploy/rollback procedure

Format:
```
### [recipe_id]
when: [when this task is needed]
steps:
1. [concrete step]
2. [concrete step]
verify: [verification command]
```

### 5. Extract Decisions (ADR)

Analyze:
- Decisions from research.md
- Tech choices from plan.md
- "Why" mentions in commit messages
- Constraints from spec.md

Extract (core 3-5):
- Architecture/stack choices
- Library/framework selections
- Data model design decisions
- Choices with tradeoffs

Format:
```
### [decision_id]
context: [why decision was needed - 1 line]
decision: [what was chosen - 1 line]
alternatives:
- [alternative]: [rejection reason]
consequences: [pros/cons - 1-2 lines]
revisit_when: [re-evaluation trigger - specific condition]
```

revisit_when examples:
- "traffic exceeds 1000 RPS"
- "error rate exceeds 5%"
- "cost exceeds $100/month"

### 6. Extract Runbook

Analyze:
- "fix", "bug", "error" related commits
- Failure cases from checklists/
- Error handling requirements from spec.md
- Common problems for this tech stack

Extract (minimum 3-5):
- Environment setup failures
- Dependency conflicts
- Database connection issues
- Auth/permission errors
- Performance degradation

Format (Symptom → Confirm → Fix → Verify → Prevent):
```
### [symptom_id]
symptom: [symptom - error message or phenomenon]
confirm: [confirmation command - copy-pasteable]
fix: [resolution procedure - step by step]
verify: [fix verification - command]
prevent: [prevention - code/config/process]
```

### 7. Extract Templates

Analyze:
- Repeating file structure patterns
- Boilerplate code
- Config file patterns

Extract:
- New module/component addition template
- Test file template
- Config file template

Format:
```
### [template_id]
purpose: [usage - 1 line]
location: [file path]
variables:
- [variable_name]: [description]
usage: [usage example - 1 line]
```

### 8. Extract Tuning Guide

Analyze:
- Performance-related settings from plan.md
- Tunable environment variables
- Resource-related configurations

Extract:
- metrics: what metrics to observe
- levers: what values can be adjusted
- guardrails: where to stop

Format:
```
metrics:
- [metric_name]: [measurement method/command]

levers:
- [tunable]: [range/options]

guardrails:
- [metric] > [threshold] → [action]
```

### 9. Extract Invariants

Analyze:
- Constraints from spec.md
- Validation rules from data-model.md
- Invariant conditions verified in tests

Extract:
- Data integrity rules
- Business logic invariants
- System constraints

### 10. Extract Task Decomposition Pattern

Analyze:
- Structure of tasks.md
- PR/commit order
- Parallel execution markers [P]

Extract:
- unit: what criteria for breaking down tasks
- parallel_boundaries: parallelizable boundaries
- pr_sequence: PR order
- definition_of_done: completion checklist

### 11. Generate Card

1. Load template from `.specify/templates/card-template.md`
2. Fill each section with extracted content
3. Create `cards/` directory at repo root if not exists
4. Write to `cards/[feature-short-name].card.md`

### 12. Report

Output:
- Path to generated card
- Number of items extracted per section
- Expected time savings for next project

## Quality Rules

### Specificity
- All commands must be copy-pasteable
- All verification must be command-based, no subjective judgment
- All conditions must be measurable numbers

### Minimality
- Each section contains only essentials (no verbose explanations)
- Remove duplicates (no repeating same content across sections)
- Exclude items that won't be used

### Reproducibility
- Executable by another person 6 months later
- Explicit, no implicit assumptions
- Clear version/environment dependencies

## Evolution Rules

Rules to keep the card as an "acceleration tool":

1. **1 incident occurs** → add 1 runbook entry + 1 regression test
2. **2 repeated tasks occur** → promote to recipes or templates
3. **6 months no reference** → archive or delete

Include these rules at the bottom of the card to encourage maintenance.