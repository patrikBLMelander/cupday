---
name: review
description: Code review with line-level findings, severity, confidence, and actionable feedback
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git diff:*)
  - Bash(git log:*)
  - Bash(git status:*)
argument-hint: "[branch or 'local']"
---

# Code Review

Reviews code changes and produces line-level findings with actionable feedback. Applies project standards from `CODE_STANDARD.md` and `CODE_OF_CONDUCT.md`. Focuses on issues that matter — signal over noise.

## Usage

```
/review                  # Review local uncommitted/staged changes
/review local            # Same as above
/review feature-branch   # Review branch diff against master
```

## Process

### 1. Gather the Diff

For local changes:

```bash
git diff
git diff --staged
git status
```

For a branch:

```bash
git diff origin/master...{branch}
git log --oneline origin/master..{branch}
```

If the diff is empty, stop and tell the user there is nothing to review.

### 2. Load Project Standards

Read both standards docs:

- `CODE_STANDARD.md` — Java/Spring backend standards
- `CODE_OF_CONDUCT.md` — React/TypeScript frontend standards

These define the rules. Do not invent rules beyond what the documents specify.

### 3. Read Changed Files in Full

For every file in the diff, read the **entire file** — not just the changed lines. You need surrounding context to:

- Understand what the function/component does
- Check if new code is consistent with existing patterns in the same file
- Spot issues that span the diff boundary (e.g. a new dependency added but cleanup missing elsewhere)

### 4. Review the Code

Evaluate the diff against these dimensions, in priority order. Only comment when there is a real finding — do not force a comment for every dimension.

#### Correctness

Logic errors, wrong behavior, off-by-one, null/undefined handling, race conditions, missing edge cases.

#### Security

XSS, injection, auth bypass, secrets in code, unsafe data handling.

#### Error Handling

Silent failures, missing catch blocks, unclear error messages, unhandled promise rejections, missing useEffect cleanup, swallowed exceptions.

#### Performance

Unnecessary re-renders, missing memoization on expensive operations, N+1 patterns, unbounded loops, memory leaks from subscriptions/timers without cleanup.

#### Architecture & Maintainability

Coupling, abstraction quality, complexity, naming clarity, dead code, DRY violations. Respect existing patterns — flag deviations from project conventions, not personal preferences.

#### Testing

Missing tests for new logic, testing implementation details instead of behavior, wrong query priority on the frontend (`getByRole` > `getByLabelText` > `getByText` > `getByTestId`), tests disproportionate to the change size on the backend.

#### Project-Specific Rules

Apply all rules from `CODE_STANDARD.md` and `CODE_OF_CONDUCT.md`. Violations are always findings.

### 5. Classify Each Finding

Every finding gets a **severity** and a **confidence**.

**Severity — what action is needed:**

| Severity       | Meaning                                                      |
| -------------- | ------------------------------------------------------------ |
| **Critical**   | Must fix. Bugs, security issues, data loss, rule violation.  |
| **Warning**    | Should fix. Performance, error handling, maintainability.    |
| **Suggestion** | Consider. Better approaches, readability, minor improvements.|

**Confidence — how certain you are:**

| Confidence   | Meaning                                                          |
| ------------ | ---------------------------------------------------------------- |
| **Definite** | This is a bug / violation. No ambiguity.                         |
| **Likely**   | This will probably cause issues under realistic conditions.      |
| **Possible** | This may cause issues depending on context you cannot fully see. |

### 6. Quality Gate: Signal Over Noise

Before outputting, review your findings list and apply these filters:

- **Would a senior developer be glad this was caught?** If not, cut it.
- **Is this already caught by the linter, type checker, or CI?** If yes, cut it.
- **Is this a stylistic preference not backed by the standards?** If yes, cut it.
- **Can you explain the real-world impact?** If not, cut it or downgrade to Suggestion.

Target 3–15 findings. More than 15 likely means noise — tighten the filter. Zero is fine; say so clearly.

## Output Format

````markdown
## Code Review: {scope description}

**{N} files changed** | {+lines} added | {-lines} removed

### Findings

**`src/core/auth/Login.tsx:45`** Critical | Definite
Uses `any` type for the login response. Bypasses TypeScript safety and violates project rules.

```tsx
// Current
const response: any = await loginApi(credentials);

// Suggested
const response: LoginResponse = await loginApi(credentials);
```

**Why:** Downstream code has no type checking on the response shape, which can cause silent runtime failures.

---

**`src/shared/game/GameCard.tsx:23`** Warning | Definite
This `useEffect` fetches data with no cleanup. If the component unmounts during the fetch, it will attempt a state update on an unmounted component.

```tsx
useEffect(() => {
  let ignore = false;
  fetchGameData(gameId).then((data) => {
    if (!ignore) setGame(data);
  });
  return () => {
    ignore = true;
  };
}, [gameId]);
```

**Why:** Race condition on fast navigation between games.

---

### Positive Patterns

- Clean separation of API logic from component rendering in `GameCard`
- Good use of `useAppSelector` with individual selectors instead of object destructuring

### Conclusion

{2–3 sentences: what the changes do, overall quality, and the key issue(s) to address. If no findings, say the code looks good.}
````

### Format Rules

- Every finding starts with the **file path and line number** in backtick-code format.
- Severity and confidence on the same line, separated by `|`.
- Code snippets included when the fix is non-obvious — skip for trivial fixes like renaming.
- **Why** line explains the real-world impact, not just the rule.
- Findings separated by horizontal rules (`---`).
- Positive patterns: 1–3 bullets max, only when genuinely earned.
- Conclusion: brief, honest assessment — not a summary of every finding.

## Constraints

- **Read-only.** Never modify code.
- **No workflow orchestration.** Don't gate, block, or direct the user to other skills.
- **Actionable findings only.** Every comment must tell the developer what to change and why.
- **Project rules, not personal taste.** Only flag violations of documented standards.
- **Honest confidence.** Say "possible" when you're not sure. Don't state guesses as facts.
