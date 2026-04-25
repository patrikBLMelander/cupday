---
name: implement-frontend
description: Frontend implementation workflow (React/TypeScript) — analysis, planning, implementation, and verification
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash(npm run test:once)
  - Bash(npm run lint)
  - Bash(npm run build)
  - Bash(git diff:*)
  - Bash(git log:*)
  - Bash(git status:*)
  - Grep
  - Glob
  - Task
argument-hint: "<task-name-or-description>"
---

# Implement Frontend Workflow

Complete workflow for implementing a frontend change in React/TypeScript with quality gates and automated verification.

## Usage

```
/implement-frontend user-roles-page
/implement-frontend "add a settings page with email + password change forms"
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
   - User-facing behavior (what the user sees / does)
   - Acceptance criteria
   - Affected components / pages / routes
   - API calls / state slices touched
3. Read `CODE_OF_CONDUCT.md` (repo root) before producing the analysis.
4. If anything is unclear, list **Open Questions** explicitly. Do not assume.
5. **STOP** — Present the analysis and resolve open questions before moving on.

### Phase 2: Planning

Produce a structured plan:

```markdown
# Implementation Plan: {task-name}

## Context
[Why the change is being made — the problem and intended outcome]

## Affected files
- `src/path/to/Component.tsx` — [what changes]
- `src/path/to/route.ts` — [what changes]

## New files
- `src/path/to/NewComponent/` — [purpose]

## State / API
- [Slices, queries, hooks involved]
- [API endpoints consumed and their shapes]

## UI / UX notes
- [Design references, copy, accessibility notes]

## Test plan
- `src/path/to/__tests__/Component.test.tsx` — [what it tests]

## Risks & concerns
- [Performance, accessibility, breaking changes, etc.]
```

Save the approved plan to `docs/plans/{task-name}.md`. Update it if the plan changes during implementation.

**STOP** — Present the plan and ask for approval before implementing.

### Phase 3: Implementation (Iterative)

For each iteration:

1. Make small changes — **max 3 files at a time**.
2. Run tests:
   ```bash
   npm run test:once
   ```
3. Run lint:
   ```bash
   npm run lint
   ```
4. **STOP** — Present changes and get feedback.
5. Iterate.

**Guidelines:**

- Follow existing patterns in the codebase.
- Use i18n for all user-facing strings.
- Follow the project's TypeScript conventions (no `any`, explicit return types on public functions).
- Add tests for new logic — proportional to the change, not exhaustive.
- Keep changes minimal and focused.

When all changes are made and tests/lint pass, **proceed directly to Phase 4.**

### Phase 4: Verification & Summary

This phase runs automatically after Phase 3. Do not wait for user input between Phase 3 and Phase 4.

1. **Prepare context:**
   - Requirements (from Phase 1)
   - Plan (from Phase 2)
   - Diff: `git diff origin/master...HEAD` (or `git diff` if no upstream)

2. **Launch `verify-frontend-review` agent** via the Task tool with `subagent_type: "general-purpose"`. Include the full contents of `.claude/agents/verify-frontend-review.md` as instructions, plus requirements, plan, and diff as context.

3. **Parse verdict** — look for `## VERDICT: PASS` or `## VERDICT: FAIL`.

4. **If PASS:**
   - Extract the full `### Findings` section verbatim (every `[SHOULD FIX]` and `[NIT]`).
   - If empty, go to Step 6.
   - Otherwise, present the list and ask via `AskUserQuestion`:
     - "Fix all"
     - "Fix specific ones"
     - "Skip — ship as-is"
   - Apply selected fixes, re-run `npm run test:once` and `npm run lint`, then go to Step 6.

5. **If FAIL:** For each `[REQUIRED]` finding:
   - Read the finding (file, line, standard violated, fix suggestion).
   - Apply the fix.
   - Re-run `npm run test:once` and `npm run lint`.
   - Log the fix in the iteration table.
   - Re-launch `verify-frontend-review` with the updated diff.
   - **Max 3 iterations.** If still failing, **STOP** and present remaining findings.

6. **Final sanity check:**
   - All tests pass.
   - Lint passes.
   - i18n coverage for new user-facing strings.
   - No unintended changes outside scope.

7. **Summary:**

   ```markdown
   ## Implementation Complete: {task-name}

   ### Files Modified
   - `src/path/to/Component.tsx` — [description]

   ### Files Created
   - `src/path/to/NewComponent/` — [description]

   ### Tests Added
   - `src/path/to/__tests__/Component.test.tsx`

   ### Verification Loop
   [Iteration table]

   ### Remaining Findings (post-verification)
   Fixed after review: ...
   Skipped by user: ...

   ### Acceptance Criteria Coverage
   - [x] Criterion 1 — implemented in Component.tsx
   - [ ] Criterion 2 — needs clarification

   ### Next Steps
   - [Any remaining tasks]
   ```

## Quality Gates

| Phase              | Gate                                                          |
| ------------------ | ------------------------------------------------------------- |
| Analysis           | User confirms requirements are understood                     |
| Planning           | User approves implementation plan                             |
| Implementation     | Tests pass, lint passes, user approves changes                |
| Verification       | `verify-frontend-review` agent returns PASS (max 3 iterations)|

Never skip a quality gate.

## Code Standards

Read `CODE_OF_CONDUCT.md` (repo root) before writing any code. Apply only to **new and modified code**.

## Constraints

- Make small, testable changes.
- Follow existing patterns.
- Don't refactor unrelated code.
- Use i18n for all user-facing strings.
- Keep changes focused on the task scope.
- Never commit changes unless the user explicitly asks for it.
