# [FEATURE_NAME] Card

feature: [FEATURE_NAME]
branch: [BRANCH_NAME]
created: [DATE]
spec: [SPEC_PATH]

## golden_path

goal: new developer reaches working state within 15 min

prerequisites:
- [required tool/environment]

steps:
1. [step]: [command or action]
2. [step]: [command or action]
3. [step]: [command or action]

success_check:
- [verification command or method]

## recipes

### [recipe_id]
when: [trigger condition]
steps:
1. [step]
2. [step]
verify: [verification method]

## decisions

### [decision_id]
context: [why decision was needed]
decision: [what was chosen]
alternatives:
- [alternative 1]: [why rejected]
- [alternative 2]: [why rejected]
consequences: [pros/cons/operational impact]
revisit_when: [trigger condition for re-evaluation]

## runbook

### [symptom_id]
symptom: [symptom description]
confirm: [confirmation command/method]
fix: [resolution procedure]
verify: [fix verification method]
prevent: [prevention measure]

## templates

### [template_id]
purpose: [usage]
location: [file path or inline]
variables:
- [variable_name]: [description]
usage: [usage example]

## tuning

metrics:
- [metric_name]: [measurement method]

levers:
- [tunable]: [range/options]

guardrails:
- [metric] > [threshold] → [action]

## invariants

- [invariant rule 1]
- [invariant rule 2]

## task_decomposition

unit: [task breakdown criteria]
parallel_boundaries:
- [parallelizable boundary]
pr_sequence:
1. [merge first]
2. [merge next]
definition_of_done:
- [completion criteria]

## evolution

rules:
- 1 incident → add 1 runbook entry + 1 regression test
- 2 repeated tasks → promote to recipe or template
- 6 months no reference → archive or delete