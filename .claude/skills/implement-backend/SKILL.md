---
name: implement-backend
description: Backend implementation workflow (Java/Spring Boot) — analysis, planning, implementation, and verification
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash(mvn:*)
  - Bash(mvnd:*)
  - Bash(git diff:*)
  - Bash(git log:*)
  - Bash(git status:*)
  - Grep
  - Glob
  - Task
argument-hint: "<task-name-or-description>"
---

# Implement Backend Workflow

Complete workflow for implementing a backend change in Java/Spring Boot with quality gates and automated verification.

## Usage

```
/implement-backend add-user-roles
/implement-backend "add a /users/{id}/roles endpoint that returns the user's role list"
```

The argument is either:

- **A task name** — resolves to `docs/tasks/{task-name}.md` (read it for the requirements)
- **A free-form description** — used directly as the requirements

If no argument is given, ask the user for the task name or description.

## Phases

### Phase 1: Analysis

1. Resolve the input:
   - If the argument matches a file under `docs/tasks/`, read it.
   - Otherwise, treat the argument (or follow-up prompt) as the requirements directly.
2. Extract:
   - What the change should accomplish (user story / problem statement)
   - Acceptance criteria (measurable conditions for "done")
   - Affected modules / packages
   - Inter-service or DB impacts
3. Read `CODE_STANDARD.md` (repo root) before producing the analysis.
4. If anything is unclear, list **Open Questions** explicitly. Do not assume.
5. **STOP** — Present the analysis. Resolve open questions with the user before moving on.

### Phase 2: Planning

Produce a structured plan:

```markdown
# Implementation Plan: {task-name}

## Context
[Why the change is being made — the problem and intended outcome]

## Affected modules
[List of modules/packages that will change]

## Changes by layer

### Entity / Migration
- `path/to/Entity.java` — [what changes]
- `V1.XXX__description.sql` — [what the migration does]

### Repository
- ...

### Service
- ...

### REST
- ...

### DTO / Mapper
- ...

### Events
- ...

### Config
- ...

## Test plan
- `path/to/TestClass.java` — [what it tests]

## Flyway migration
- Version: V1.XXX (verified next available — `ls` the migrations folder before locking this in)

## Risks & concerns
- [Breaking API changes, migration rollback, multi-pod safety, etc.]
```

Save the approved plan to `docs/plans/{task-name}.md`. If the plan changes during implementation, update this file — it should be committed alongside the implementation.

**STOP** — Present the plan and ask for approval before implementing.

### Phase 3: Implementation (Iterative)

For each iteration:

1. Make small changes — **max 3 files at a time**.
2. Build:
   ```bash
   mvnd install -DskipTests
   ```
3. Run tests for affected modules. Prefer `mvnd`, fall back to `mvn -T 1C`:
   ```bash
   mvnd test -Dtest=TestClassName
   ```
4. **STOP** — Present changes and get feedback.
5. Iterate.

When all changes are made, build passes, and tests pass, **proceed directly to Phase 4. Do not present a final summary — that is Phase 4's job.**

### Phase 4: Verification & Summary

This phase runs automatically after Phase 3. Do not wait for user input between Phase 3 and Phase 4.

1. **Prepare context:**
   - Requirements (from Phase 1)
   - Plan (from Phase 2)
   - Diff: `git diff origin/master...HEAD` (or `git diff` if no upstream)

2. **Launch `verify-backend-review` agent** via the Task tool with `subagent_type: "general-purpose"`. Include the full contents of `.claude/agents/verify-backend-review.md` as instructions, plus requirements, plan, and diff as context.

3. **Parse verdict** — look for `## VERDICT: PASS` or `## VERDICT: FAIL`.

4. **If PASS:**
   - Extract the full `### Findings` section verbatim (every `[SHOULD FIX]` and `[NIT]`).
   - If empty, go to Step 6.
   - Otherwise, present the list and ask via `AskUserQuestion`:
     - "Fix all" (recommended when any `[SHOULD FIX]`)
     - "Fix specific ones" (user replies with numbers)
     - "Skip — ship as-is"
   - Apply selected fixes, rebuild, re-run affected tests, then go to Step 6. Record what was fixed vs. skipped for the Summary.

5. **If FAIL:** For each `[REQUIRED]` finding:
   - Read the finding (file, line, standard violated, fix suggestion).
   - Apply the fix.
   - Rebuild: `mvnd install -DskipTests`
   - Re-run tests for affected modules.
   - Log the fix in the iteration table.
   - Re-launch `verify-backend-review` with the updated diff.
   - **Max 3 iterations.** If still failing, **STOP** and present remaining findings — let the user choose to fix manually, override, or investigate.

6. **Final sanity check:**
   - All tests pass for affected modules.
   - Build succeeds.
   - Flyway migration version is correct and sequential.
   - No unintended changes outside scope.

7. **Summary:**

   ```markdown
   ## Implementation Complete: {task-name}

   ### Files Modified
   - `path/to/File.java` — [description]

   ### Files Created
   - `path/to/NewFile.java` — [description]

   ### Database Migrations
   - `V1.XXX__description.sql` — [what it does]

   ### Tests Added/Modified
   - `path/to/FileTest.java` — [what it tests]

   ### Verification Loop

   | Iteration | Verdict | Issues Found             | Fixed      | Remaining                   |
   | --------- | ------- | ------------------------ | ---------- | --------------------------- |
   | 1         | FAIL    | 3 REQUIRED, 1 SHOULD FIX | 3 REQUIRED | 1 SHOULD FIX                |
   | 2         | PASS    | 0 REQUIRED, 1 SHOULD FIX | —          | 1 SHOULD FIX (non-blocking) |

   ### Remaining Findings (post-verification)
   Fixed after review:
   - [SHOULD FIX] File.java:12 — {description} (fixed)

   Skipped by user:
   - [NIT] File.java:45 — {description}

   Omit this section if there were no `[SHOULD FIX]` or `[NIT]` findings.

   ### Acceptance Criteria Coverage
   - [x] Criterion 1 — implemented in File.java
   - [x] Criterion 2 — implemented in File.java
   - [ ] Criterion 3 — needs clarification

   ### Next Steps
   - [Any remaining tasks]
   ```

## Quality Gates

| Phase          | Gate                                                                |
| -------------- | ------------------------------------------------------------------- |
| Analysis       | User confirms requirements are understood                           |
| Planning       | User approves implementation plan and migration version             |
| Implementation | Build succeeds, tests pass, user approves changes                   |
| Verification   | `verify-backend-review` agent returns PASS (max 3 iterations)       |

Never skip a quality gate.

## Code Standards

Read `CODE_STANDARD.md` (repo root) before writing any code. It is the single source of truth for formatting, Java code quality, and multi-pod safety. Apply only to **new and modified code** — do not refactor existing code unless directly touched by the task.

## Constraints

- Make small, testable changes.
- Follow existing patterns in the target module.
- Don't refactor unrelated code.
- Keep changes focused on the task scope.
- Always check for existing Flyway migration versions before creating new ones.
- Never commit changes unless the user explicitly asks for it.
