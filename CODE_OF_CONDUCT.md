# Frontend Code of Conduct & Best Practices

**Last Updated:** 2025-12-05
**Applies to:** React 18+, TypeScript 5+, Redux Toolkit, React Testing Library

> **TODO (cup):** This was copied from a sibling project. Prune sections that don't apply once the cup frontend stack is finalized — likely candidates: white-label/multi-operator notes, `protocol.ts` references, operator isolation rules, and the per-app compliance scores below.

## Compliance Scores

**Last Scored:** 2025-12-05

_See individual reports: `player-frontend/reports/CODE_OF_CONDUCT-report-[date].md` and `admin-frontend/reports/CODE_OF_CONDUCT-report-[date].md`_

| Frontend Application | Score | Status            | Change from Previous |
| -------------------- | ----- | ----------------- | -------------------- |
| **player-frontend**  | 52    | Needs improvement | No change            |
| **admin-frontend**   | 42    | Needs improvement | No change            |

**Scoring Scale:** 1-100

- **90-100**: Excellent compliance, minimal issues
- **80-89**: Good compliance, some areas need improvement
- **70-79**: Moderate compliance, several areas need attention
- **60-69**: Below average compliance, significant improvements needed
- **Below 60**: Poor compliance, major refactoring required

**Assessment Criteria:**

- Component structure and patterns
- State management implementation
- Side effects handling
- TypeScript usage and type safety
- Performance optimization
- Error handling
- Testing coverage and quality
- Code organization and maintainability
- Third-party packages management

---

## Table of Contents

- [Compliance Scores](#compliance-scores)
- [Introduction](#introduction)
- [Quick Reference](#quick-reference)
- [Folder Structure & File Organization](#folder-structure--file-organization)
- [Core Principles](#core-principles)
- [Component Structure](#component-structure)
- [State Management](#state-management)
- [Side Effects](#side-effects)
- [Async/Await](#asyncawait)
- [TypeScript Types, Interfaces, Enums, and Constants](#typescript-types-interfaces-enums-and-constants)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Formatting and Style](#formatting-and-style)
- [Naming and Documentation](#naming-and-documentation)
- [Internationalization (i18n)](#internationalization-i18n)
- [Testing](#testing)
- [Third-Party Packages](#third-party-packages)
- [Examples & Anti-Patterns](#examples--anti-patterns)
- [CSS Theming](#css-theming)
- [Resources](#resources)

## Introduction

This document outlines the core coding standards and best practices for all frontend applications in this project (player-frontend, admin-frontend, affiliate-frontend). It is intended for all internal contributors and aims to reduce technical debt, improve maintainability, and ensure high-quality delivery across all frontend codebases.

---

## Quick Reference

**Component Patterns:**

- ✅ Functional components only
- ✅ Hooks for state and side effects
- ✅ Function declarations preferred (better stack traces)

**State Management:**

- ✅ Redux with typed hooks (`useAppSelector`, `useAppDispatch`)
- ✅ Memoized selectors for derived state
- ✅ Avoid `connect` HOC

**Side Effects:**

- ✅ `useEffect` as last resort
- ✅ Always include cleanup functions
- ✅ Separate effects by concern

**TypeScript:**

- ✅ Interfaces for object shapes
- ✅ Type aliases for unions/intersections
- ✅ Explicit return types
- ✅ Avoid `any`

**Testing:**

- ✅ Test behavior, not implementation
- ✅ Use `getByRole` over `getByTestId` for component tests
- ✅ Use `data-testid` for E2E tests (standard practice)
- ✅ Test accessibility

---

## Folder Structure & File Organization

- **`core/`**: Contains all core components and functionality shared across the frontend.
- **`shared/`**: For code that is reusable across multiple domains or features, but not core to the app.
- **`operator/`**: Contains operator/customer-specific code. Code in this folder must not be imported or used by any other operator/customer.
- **Feature folders**: Organize by feature when possible. Keep files small and focused.

**Guidelines:**

- Place reusable logic/components in `core/` or `shared/` as appropriate.
- Operator-specific logic must be isolated in `operator/`.
- Avoid large, monolithic files—prefer small, focused modules.

---

## Core Principles

- **Consistency, readability, and maintainability** are top priorities.
- **Functional programming**: Prefer pure functions and avoid side effects.
- **Inversion of control**: Design components to be flexible and composable. [Read more](https://kentcdodds.com/blog/inversion-of-control)
- **Broken window theory**: Prioritize code quality issues urgently to prevent systematic degradation and maintain high standards across the codebase. [Read more](https://blog.codinghorror.com/the-broken-window-theory/)
- **Clean code**: We always strive to write clean code. [Read more](https://gist.github.com/wojteklu/73c6914cc446146b8b533c0988cf8d29)

**Good Example: Consistency & Readability**

```tsx
// Good: Consistent naming, clear structure, and readable logic
function getUserFullName(user: {
  firstName: string;
  lastName: string;
}): string {
  return `${user.firstName} ${user.lastName}`;
}
```

**Bad Example: Inconsistency & Poor Readability**

```tsx
// Bad: Inconsistent naming, unclear logic
function n(u) {
  return u.f + " " + u.l;
}
// It's unclear what 'n', 'u', 'f', and 'l' mean.
```

**Good Example: Maintainability & Functional Programming**

```tsx
// Good: Pure function, easy to test and reuse
function add(a: number, b: number): number {
  return a + b;
}
```

**Bad Example: Poor Maintainability & Side Effects**

```tsx
// Bad: Function with side effects, hard to test
let total = 0;
function add(a: number, b: number) {
  total += a + b;
  return total;
}
// This function changes external state, making it unpredictable.
```

**Good Example: Inversion of Control**

```tsx
// Good: Accepts dependencies as parameters, easy to test and reuse
function fetchData(fetcher: () => Promise<any>) {
  return fetcher();
}
```

**Bad Example: Tight Coupling (No Inversion of Control)**

```tsx
// Bad: Hardcoded dependency, not flexible
function fetchData() {
  return fetch("/api/data");
}
// This function can't be easily reused or tested with different fetchers.
```

---

## Component Structure

- **Use functional components only.**
- **Hooks** are the standard for state and side effects.
- Extract reusable JSX into separate components.
- Avoid deeply nested or overly complex components.
- **Prefer function declarations** for components (better stack traces in debugging), but arrow functions are acceptable.

**Good Example:**

```tsx
// Good: Functional, reusable, and simple
export function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
// Easy to test and reuse.
```

**Bad Example:**

```tsx
// Bad: Class component, not reusable
class UserCard extends React.Component {
  render() {
    return <div>{this.props.user.name}</div>;
  }
}
// Class components are discouraged in favor of functional components.
```

---

## State Management

- **Use Redux with hooks** (`useSelector`, `useDispatch`).
- **Do not use** `connect` or direct store imports.
- Use `react-hook-form` for form state.
- **Create typed hooks** for better TypeScript support.

**Good Example: Basic Redux Hooks**

```tsx
import { useSelector, useDispatch } from "react-redux";
const value = useSelector((state) => state.value);
const dispatch = useDispatch();
// Hooks are more concise and work only with functional components.
```

**Best Practice: Typed Hooks (TypeScript)**

Create typed versions of hooks for better type safety and developer experience:

```tsx
// hooks.ts
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

// Usage in components
import { useAppSelector, useAppDispatch } from "./hooks";

function Counter() {
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();
  // TypeScript now knows the exact types
}
```

**Selector Best Practices:**

- Use memoized selectors for derived state to prevent unnecessary re-renders
- Avoid returning new object/array literals from selectors
- Use `shallowEqual` from react-redux when returning objects
- Select individual values when possible

```tsx
// Bad: Returns new object on every call, causing unnecessary re-renders
const { count, user } = useSelector((state) => ({
  count: state.count,
  user: state.user,
}));

// Good: Select individual values
const count = useSelector((state) => state.count);
const user = useSelector((state) => state.user);

// Good: Use shallowEqual for object returns when needed
import { shallowEqual, useSelector } from "react-redux";
const data = useSelector(
  (state) => ({ count: state.count, user: state.user }),
  shallowEqual,
);

// Good: Use memoized selectors for expensive computations
import { createSelector } from "@reduxjs/toolkit";
const selectCompletedTodos = createSelector(
  (state) => state.todos,
  (todos) => todos.filter((todo) => todo.completed),
);
const completedTodos = useSelector(selectCompletedTodos);
```

**Bad Example:**

```tsx
import { connect } from "react-redux"; // Avoid
// connect is legacy and not compatible with hooks-only approach.
```

---

## Side Effects

- Use `useEffect` **as a last resort**. Prefer derived state and props. [Read more](https://react.dev/learn/you-might-not-need-an-effect)
- **Separate effects by concern, not by timing**. Each effect should have a single responsibility.
- **Avoid combining unrelated logic** in a single effect. Multiple focused effects are better than one complex effect.
- **Always include cleanup functions** for subscriptions, timers, and async operations to prevent memory leaks and race conditions.

**Good Example: Fetching data on mount with cleanup**

```tsx
// Good: Fetches user data when component mounts with proper cleanup
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchUserData() {
      try {
        const data = await fetchUser(userId);
        if (!ignore) {
          setUser(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to fetch user");
        }
      }
    }

    fetchUserData();

    return () => {
      ignore = true; // Prevents state updates after unmount
    };
  }, [userId]);
}
```

**Good Example: Multiple focused effects**

```tsx
// Good: Separate effects for different concerns
useEffect(() => {
  // Script loading logic
  loadScript(scriptUrl);
  return () => {
    // Cleanup: remove script if needed
  };
}, [scriptUrl]);

useEffect(() => {
  // Element creation logic
  if (scriptLoaded) {
    const element = createElement();
    return () => {
      // Cleanup: remove element
      element.remove();
    };
  }
}, [scriptLoaded]);

useEffect(() => {
  // Attribute updates logic
  updateAttributes();
}, [attributes]);
```

**Dependency Array Best Practices:**

- Include all reactive values (props, state) used in the effect
- Move helper functions inside `useEffect` when they're only used there
- Use `useCallback` for functions that need to be stable across renders
- Never omit dependencies to "fix" lint warnings

```tsx
// Bad: Missing dependency
useEffect(() => {
  fetchUser(userId);
}, []); // Missing userId - causes stale closures

// Good: All dependencies declared
useEffect(() => {
  fetchUser(userId);
}, [userId]);

// Good: Helper function inside effect
useEffect(() => {
  function createOptions() {
    return { serverUrl, roomId };
  }
  const connection = createConnection(createOptions());
  return () => connection.disconnect();
}, [serverUrl, roomId]);

// Good: Using useCallback for stable function reference
const handleSubmit = useCallback(
  (data: FormData) => {
    submitForm(data);
  },
  [], // Empty deps if submitForm is stable
);

useEffect(() => {
  // Use handleSubmit
}, [handleSubmit]);
```

**Bad Example: Deriving state with useEffect**

```tsx
// Bad: Derives fullName with useEffect (unnecessary)
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${user.firstName} ${user.lastName}`);
}, [user]);
```

**Bad Example: Single complex effect**

```tsx
// Bad: One effect doing multiple unrelated things
useEffect(() => {
  if (!scriptLoaded) {
    loadScript();
    return;
  }
  if (!element) {
    createElement();
    return;
  }
  updateAttributes();
}, [scriptLoaded, element, attributes]);
// This is hard to debug and understand
```

**Good Example: Derive directly in render**

```tsx
// Good: Derive fullName in render
const fullName = `${user.firstName} ${user.lastName}`;
return <div>{fullName}</div>;
```

---

## Async/Await

- **Only use `async`/`await` when working with Promises.** Do not mark functions as `async` unless they contain an `await` expression or explicitly return a Promise.
- Prefer `async`/`await` over `.then()` chains for readability and error handling when consuming Promises.
- An `async` function always returns a Promise — avoid wrapping already-Promise-returning calls in an unnecessary `async` function.

**Good Example: `async` used only where needed**

```tsx
// Good: async is justified — the function awaits a Promise
async function fetchUser(userId: string): Promise<User> {
  const response = await api.get(`/users/${userId}`);
  return response.data;
}

// Good: synchronous function, no async needed
function formatUserName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}
```

**Bad Example: unnecessary `async`**

```tsx
// Bad: async adds no value — no await inside, just returns a value
async function formatUserName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

// Bad: async wrapping an already-Promise-returning call unnecessarily
async function fetchUser(userId: string): Promise<User> {
  return api.get(`/users/${userId}`); // no await, async is redundant
}
```

---

## TypeScript Types, Interfaces, Enums, and Constants

- **Colocate types with component files** when they are only used in one component.
- **Create separate types files** when types are shared across multiple components or modules.
- Follow the application's structure with types in `core/types/`, `shared/types/`, and `operator/types/`.
- **Use interfaces for objects** that represent a clear shape or entity.
- **Use type aliases for unions, intersections, or mapped types**.
- **Follow PascalCase naming** for both interfaces and type aliases.
- **Use PascalCase for enum names** and **UPPER_SNAKE_CASE for enum values**.
- **Avoid `any` type** unless absolutely necessary.
- **Define explicit return types** for functions.
- **Use optional properties** (`?`) instead of nullable values.

**Interface vs Type Alias Guidelines:**

- **Use interfaces** for object shapes that may be extended or merged
- **Use type aliases** for unions, intersections, mapped types, or when you need computed properties
- **Prefer interfaces** for object composition (better performance and error messages)
- **Use type aliases** when you need to represent something that isn't an object shape

```tsx
// Good: Interface for extensible object shape
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
}

interface AdminProfile extends UserProfile {
  permissions: string[];
}

// Good: Type alias for union
type PaymentStatus = "pending" | "completed" | "failed";

// Good: Type alias for component variants
type ButtonVariant = "primary" | "secondary" | "danger";

// Good: Type alias for intersection
type UserWithPermissions = UserProfile & { permissions: string[] };

// Good: Interface for composition (better than intersection types)
interface UserWithPermissions extends UserProfile {
  permissions: string[];
}
```

**Enum Best Practices:**

- Use regular `enum` for most cases (better for library exports, debugging)
- Use `const enum` only when you need inlined values and don't export the enum
- Prefer string enums over numeric enums for better debugging and type safety

```tsx
// Good: Regular enum (recommended for most cases)
export enum UserStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}

// Good: Const enum (only when not exported and inlining is needed)
const enum InternalStatus {
  PENDING = "pending",
  PROCESSING = "processing",
}

// Avoid: Numeric enums (less type-safe, harder to debug)
enum BadStatus {
  ACTIVE, // 0
  SUSPENDED, // 1
}
```

**Good Example: Function with explicit return type**

```tsx
// Good: Function with explicit return type
function getUserDisplayName(user: UserProfile): string {
  return `${user.firstName} ${user.lastName}`;
}
```

---

## Performance Optimization

- Use `React.memo` for expensive components that receive stable props
- Use `useMemo` for expensive computations
- Use `useCallback` for stable function references passed to memoized children
- Avoid premature optimization; measure first with React DevTools Profiler
- Use code splitting for large components and routes

**Good Example: Memoized expensive component**

```tsx
// Good: Memoized expensive component
interface ExpensiveListProps {
  items: Item[];
  onItemClick: (id: string) => void;
}

export const ExpensiveList = React.memo(
  ({ items, onItemClick }: ExpensiveListProps) => {
    const sortedItems = useMemo(() => {
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    return (
      <ul>
        {sortedItems.map((item) => (
          <li key={item.id} onClick={() => onItemClick(item.id)}>
            {item.name}
          </li>
        ))}
      </ul>
    );
  },
);
```

**Good Example: useCallback for stable references**

```tsx
// Good: Memoized callback prevents unnecessary re-renders
function Parent({ items }: { items: Item[] }) {
  const handleItemClick = useCallback((id: string) => {
    console.log("Clicked:", id);
  }, []); // Empty deps - function doesn't depend on props/state

  return <ExpensiveList items={items} onItemClick={handleItemClick} />;
}
```

**Bad Example: Unnecessary memoization**

```tsx
// Bad: Memoizing simple computations
const sum = useMemo(() => a + b, [a, b]); // Unnecessary - addition is cheap

// Good: Only memoize expensive operations
const expensiveResult = useMemo(() => {
  return items.reduce((acc, item) => {
    // Complex computation
    return acc + processItem(item);
  }, 0);
}, [items]);
```

---

## Error Handling

- Use Error Boundaries for component tree error handling
- Handle async errors in `useEffect` with try/catch
- Provide user-friendly error messages
- Log errors appropriately for debugging

**Good Example: Error boundary implementation**

```tsx
// Good: Error boundary for component tree
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**Good Example: Async error handling in useEffect**

```tsx
// Good: Async error handling
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchUserData() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUser(userId);
        if (!ignore) {
          setUser(data);
        }
      } catch (err) {
        if (!ignore) {
          const message =
            err instanceof Error ? err.message : "Failed to fetch user";
          setError(message);
          // Log error for debugging
          console.error("Failed to fetch user:", err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchUserData();

    return () => {
      ignore = true;
    };
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{user?.name}</div>;
}
```

---

## Formatting and Style

- **Prettier and ESLint** are the source of truth for formatting and linting.
- Do not include manual formatting rules here; see `.prettierrc` and `.eslintrc`.

---

## Naming and Documentation

- Use **clear, semantic names** for variables, functions, and components.
- **Never abbreviate names.** Write the full word: `transaction` not `tx`, `response` not `res`, `error` not `err`, `index` not `i` (outside simple loops), `component` not `comp`, `config` not `cfg`. If a name feels too long, the abstraction likely needs improving — not the name.
- Document all reusable components/functions with JSDoc or similar.
- Minimize inline comments; only comment non-obvious logic.

**Good Example:**

```ts
/**
 * Formats a currency value for display.
 * @param amount - The numeric amount to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  // ...
}
```

**Bad Example:**

```ts
// Formats
function f(a) {
  // ...
}
```

---

## Internationalization (i18n)

- **All user-facing text must use i18n.**
- Never hardcode strings in components.

**Good Example:**

```tsx
import { t } from "../i18n";
<span>{t("profile.greeting")}</span>;
```

**Bad Example:**

```tsx
<span>Hello, user!</span>
```

---

## Testing

- Use React Testing Library and Jest.
- Focus on meaningful coverage — test critical logic and user flows.
- Test behavior, not implementation details.
- Use descriptive test names and group related tests.
- Mock external dependencies as needed, but avoid over-mocking.
- **Test accessibility** using semantic queries (`getByRole`, `getByLabelText`).
- **Test async behavior** using `waitFor` and `findBy*` queries.

### Query Priority for Component Tests

React Testing Library prioritizes queries that mirror how users interact with your application. Use queries in this order:

1. **`getByRole`** — Preferred for most cases (tests accessibility and user behavior)
2. **`getByLabelText`** — For form inputs
3. **`getByPlaceholderText`** — For inputs with placeholders
4. **`getByText`** — For text content
5. **`getByDisplayValue`** — For form values
6. **`getByAltText`** — For images
7. **`getByTitle`** — For elements with title attributes
8. **`getByTestId`** — Last resort (only when no other query works)

**Why `getByRole` is preferred:**

- Tests accessibility — ensures elements are properly labeled and accessible
- Tests user behavior — queries elements the way users interact with them
- More resilient — less likely to break when implementation changes
- Better error messages — React Testing Library provides helpful suggestions

**When `getByTestId` is acceptable in component tests:**

- Non-semantic elements (e.g., widget injection points, decorative containers)
- Complex nested structures where semantic roles don't apply
- Testing internal structure that isn't user-facing (rare cases)

### E2E Tests and `data-testid`

For end-to-end tests (Playwright, Cypress, etc.), using `data-testid` attributes is **standard practice and recommended**:

- **Stable selectors**: E2E tests need reliable element identification across UI changes
- **Industry standard**: Widely accepted pattern for E2E automation
- **Less brittle**: More resilient than CSS selectors or XPath
- **Better collaboration**: Clear contract between developers and QA teams

**Best practices for `data-testid`:**

- Use descriptive, consistent naming (kebab-case recommended)
- Ensure uniqueness within context
- Document test ID conventions
- Keep test IDs separate from production attributes

**Good Example: User-centric, clear, and robust**

```tsx
// Good: Tests what the user sees and does
import { render, screen, fireEvent } from "@testing-library/react";
import LoginForm from "./LoginForm";

test("shows error message on invalid email", () => {
  render(<LoginForm />);
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "bademail" },
  });
  fireEvent.click(screen.getByRole("button", { name: /submit/i }));
  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
});
// This test describes a real user scenario and checks visible output.
```

**Good Example: Accessibility testing**

```tsx
// Good: Tests accessibility
import { render, screen } from "@testing-library/react";

test("submit button is accessible and enabled", () => {
  render(<LoginForm />);
  const submitButton = screen.getByRole("button", { name: /submit/i });
  expect(submitButton).toBeEnabled();
  expect(submitButton).toHaveAttribute("type", "submit");
});

test("can submit form with Enter key", () => {
  render(<LoginForm />);
  const input = screen.getByLabelText(/email/i);
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  expect(mockSubmit).toHaveBeenCalled();
});
```

**Good Example: Async testing**

```tsx
// Good: Testing async behavior
import { render, screen, waitFor } from "@testing-library/react";

test("displays user data after loading", async () => {
  render(<UserProfile userId="123" />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  const userName = await screen.findByText("John Doe");
  expect(userName).toBeInTheDocument();
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});

test("handles loading errors", async () => {
  mockFetchUser.mockRejectedValueOnce(new Error("Network error"));

  render(<UserProfile userId="123" />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

**Good Example: When `getByTestId` is acceptable**

```tsx
// Good: Using getByTestId for non-semantic widget injection point
import { render, screen } from "@testing-library/react";
import { WidgetSlot } from "./WidgetSlot";

test("renders widget slot with correct test id", () => {
  render(<WidgetSlot slotId="mobile-header" />);
  const slot = screen.getByTestId("widget-slot-mobile-header");
  expect(slot).toBeInTheDocument();
});
// Acceptable: WidgetSlot is a non-semantic injection point for external widgets
```

**Bad Example: Tests implementation details, not user behavior**

```tsx
// Bad: Relies on internal state, not user behavior
import { render } from "@testing-library/react";
import LoginForm from "./LoginForm";

test("sets error state on invalid email", () => {
  const { container } = render(<LoginForm />);
  // Directly access component state or internals (not recommended)
  expect(container.firstChild.state.error).toBe("Invalid email");
});
// This test is brittle and will break if implementation changes.
```

**Bad Example: Using `getByTestId` when semantic queries work**

```tsx
// Bad: Using getByTestId when getByRole would work
import { render, screen } from "@testing-library/react";
import LoginForm from "./LoginForm";

test("submits form", () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByTestId("submit-button")); // ❌ Bad
  // Should use: screen.getByRole("button", { name: /submit/i })
});
// This misses accessibility testing and doesn't verify the button is properly labeled.
```

---

## Third-Party Packages

- **Evaluate packages thoroughly** before adding them to the project.
- **Prioritize security** by auditing dependencies regularly.
- **Minimize dependencies** to reduce attack surface and maintenance burden.
- **Use trusted sources** (npm registry) and verify package integrity.
- **Review licenses** to ensure compatibility with project requirements.
- **Monitor package maintenance** and plan for deprecation.

### Package Evaluation Criteria

Before adding a new package, evaluate it against these criteria:

1. **Functionality Fit**: Does it solve a specific problem that cannot be efficiently solved with existing tools or custom code?
2. **Popularity and Community**: High download counts, GitHub stars, and active community indicate reliability.
3. **Active Maintenance**: Recent commits, regular releases, and prompt issue resolution show ongoing support.
4. **Documentation Quality**: Well-documented packages are easier to integrate and maintain.
5. **Bundle Size Impact**: Consider the package size and its impact on application performance.
6. **Dependency Chain**: Prefer packages with minimal dependencies to reduce vulnerability surface.
7. **TypeScript Support**: Native TypeScript support or high-quality type definitions are preferred.

**Good Example: Evaluating a package**

```bash
# Check package information
npm view <package-name>
npm view <package-name> dependencies
npm view <package-name> time

# Check bundle size
npx package-size <package-name>

# Review GitHub repository
# - Check recent commits
# - Review open issues
# - Check documentation quality
```

### Security Best Practices

- **Run security audits regularly** using `npm audit` to identify vulnerabilities.
- **Fix vulnerabilities promptly** using `npm audit fix` when possible.
- **Review audit reports** before deploying to production.
- **Use Subresource Integrity (SRI)** when loading external scripts from CDNs.
- **Implement Content Security Policy (CSP)** to restrict resource loading.
- **Monitor for supply chain attacks** by reviewing package maintainers and update history.

**Good Example: Regular security audits**

```bash
# Run security audit
npm audit

# Automatically fix vulnerabilities
npm audit fix

# Audit only production dependencies
npm audit --omit=dev

# Generate detailed audit report
npm audit --json > audit-report.json
```

**Good Example: Subresource Integrity (SRI)**

```html
<!-- Good: Using SRI to verify script integrity -->
<script
  src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgCY4Q4D1zJkPBw8HcWic9kF5qGjFONQ5xfeR2zi5TUKL8wT5"
  crossorigin="anonymous"
></script>
```

### Version Management

- **Use semantic versioning (semver)** ranges appropriately:
  - `^1.2.3` - Accepts minor and patch updates (recommended for most cases)
  - `~1.2.3` - Accepts only patch updates (more conservative)
  - `1.2.3` - Exact version (use sparingly, for critical dependencies)
- **Pin exact versions** for critical dependencies that must not change.
- **Use `package-lock.json`** to ensure consistent installations across environments.
- **Review dependency updates** before merging to avoid breaking changes.
- **Use `overrides`** in `package.json` to force specific versions of transitive dependencies when needed.

**Good Example: Version ranges in package.json**

```json
{
  "dependencies": {
    "react": "^18.2.0", // Accepts 18.x.x updates
    "lodash": "~4.17.21", // Accepts only patch updates
    "critical-lib": "1.2.3" // Exact version for critical dependencies
  },
  "overrides": {
    "vulnerable-package": "1.2.5" // Force version for transitive dependency
  }
}
```

**Bad Example: Using `latest` tag**

```json
{
  "dependencies": {
    "some-package": "latest" // ❌ Bad: Unpredictable updates
  }
}
```

### Performance Considerations

- **Use tree shaking** to eliminate unused code from bundles.
- **Implement code splitting** for large third-party libraries.
- **Lazy load** heavy dependencies when possible.
- **Monitor bundle size** and set size budgets.
- **Prefer modular imports** over importing entire libraries.

**Good Example: Tree-shakable imports**

```tsx
// Good: Import only what you need (tree-shakable)
import { debounce } from "lodash-es";
import { format } from "date-fns";

// Bad: Import entire library (not tree-shakable)
import _ from "lodash";
import * as dateFns from "date-fns";
```

**Good Example: Lazy loading heavy dependencies**

```tsx
// Good: Lazy load heavy charting library
import { lazy, Suspense } from "react";

const ChartLibrary = lazy(() => import("heavy-chart-library"));

function Dashboard() {
  return (
    <Suspense fallback={<div>Loading charts...</div>}>
      <ChartLibrary data={chartData} />
    </Suspense>
  );
}
```

### Maintenance and Updates

- **Monitor package updates** regularly for security patches and bug fixes.
- **Test updates** in development before deploying to production.
- **Plan for deprecation** by identifying alternative packages early.
- **Document package decisions** including why a package was chosen and alternatives considered.
- **Remove unused dependencies** regularly to reduce maintenance burden.

**Good Example: Checking for outdated packages**

```bash
# Check for outdated packages
npm outdated

# Update packages interactively
npx npm-check-updates -i

# Update to latest versions (review before committing)
npx npm-check-updates -u
```

**Good Example: Removing unused dependencies**

```bash
# Find potentially unused dependencies
npx depcheck

# Remove unused dependencies
npm uninstall <package-name>
```

### Package Selection Checklist

Before adding a new package, verify:

- [ ] Package solves a specific problem not easily solved otherwise
- [ ] Package is actively maintained (recent commits, regular releases)
- [ ] Package has good documentation and community support
- [ ] Package bundle size is acceptable for the functionality provided
- [ ] Package has minimal or acceptable dependency chain
- [ ] Package has TypeScript support or high-quality type definitions
- [ ] Package has been audited for security vulnerabilities
- [ ] Package alternatives have been evaluated
- [ ] Package decision has been documented

### Anti-Patterns

**❌ Anti-Pattern: Adding packages without evaluation**

```bash
# Bad: Installing without proper evaluation
npm install random-package
```

**❌ Anti-Pattern: Ignoring security vulnerabilities**

```bash
# Bad: Disabling audits instead of fixing issues
npm install --no-audit
npm set audit false
```

**❌ Anti-Pattern: Using `latest` tag**

```json
{
  "dependencies": {
    "package": "latest" // ❌ Unpredictable, can break builds
  }
}
```

**❌ Anti-Pattern: Not reviewing transitive dependencies**

```bash
# Bad: Not checking what dependencies bring in
npm install package-a
# package-a might bring in 50+ transitive dependencies
```

**✅ Good Pattern: Comprehensive evaluation**

```bash
# Good: Evaluate before installing
npm view package-name
npm view package-name dependencies
npm outdated package-name
npx package-size package-name
# Review GitHub repo, documentation, license
# Then install with appropriate version range
npm install package-name@^1.0.0
```

---

## Examples & Anti-Patterns

- Avoid direct store access, prop drilling, and large files.
- Extract logic and UI into small, focused modules.
- Prefer composition over inheritance.

**Anti-Pattern Example: Direct Store Access**

```tsx
// Direct store import (do not do this)
import store from "../store";
const value = store.getState().value;
// This bypasses React-Redux and breaks the component model.
```

**Anti-Pattern Example: Mounted Flags**

```tsx
// Bad: Using mounted flags to prevent state updates after unmount
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchUser(userId).then((data) => {
      if (isMountedRef.current) {
        setUser(data);
      }
    });
    return () => {
      isMountedRef.current = false;
    };
  }, [userId]);
  // Mounted flags are an anti-pattern and indicate improper cleanup.
  // Use cleanup functions with ignore flags instead.
}
```

**Anti-Pattern Example: Missing Dependencies**

```tsx
// Bad: Missing dependencies causes stale closures
function ChatRoom({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => connection.disconnect();
  }, []); // Missing roomId and serverUrl - causes bugs
}
```

**Anti-Pattern Example: Creating Objects in Render**

```tsx
// Bad: New object on every render causes unnecessary re-renders
function Component({ userId }: { userId: string }) {
  const options = { userId, serverUrl: "https://api.example.com" };

  useEffect(() => {
    fetchData(options);
  }, [options]); // options is new on every render, causing infinite loop
}

// Good: Create object inside effect or use useMemo
function Component({ userId }: { userId: string }) {
  useEffect(() => {
    const options = { userId, serverUrl: "https://api.example.com" };
    fetchData(options);
  }, [userId]);
}
```

**Anti-Pattern Example: Returning Objects from Selectors**

```tsx
// Bad: Returns new object on every call, causing unnecessary re-renders
const { count, user } = useSelector((state) => ({
  count: state.count,
  user: state.user,
}));

// Good: Select individual values
const count = useSelector((state) => state.count);
const user = useSelector((state) => state.user);
```

---

## CSS Theming

> Currently applies to: `player-frontend/src/core/ui/` — intended direction for all frontend applications.
> Full reference: [`docs/css-theming-guidelines.md`](docs/css-theming-guidelines.md)

CSS custom properties exist to allow operators to retheme the UI at runtime, without targeting internal class names or deeply nested selectors.

**Rules:**
- Use the three-tier token system: Primitive → Semantic → Component
- Never reference primitive tokens directly in components — go through semantic or component-level variables
- Declare component-level variables with their defaults on the component class — this is the operator API
- Operators override component variables by targeting the component class, not `:root`
- Do not add ad-hoc CSS values where a token already exists

---

## Resources

- [React Official Documentation](https://react.dev/learn) - Comprehensive React guides and API reference
- [React useEffect Complete Guide](https://react.dev/reference/react/useEffect) - Deep dive into useEffect patterns
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - TypeScript language documentation
- [TypeScript Performance](https://github.com/microsoft/typescript/wiki/Performance) - Performance best practices
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/) - Official Redux Toolkit guide
- [Redux Style Guide](https://redux.js.org/style-guide/style-guide) - Redux best practices
- [React-Redux Hooks Documentation](https://react-redux.js.org/api/hooks) - Official hooks API reference
- [React Testing Library Documentation](https://testing-library.com/react) - Testing best practices
- [React Testing Library Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) - Common testing pitfalls
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) - When to avoid useEffect
- [Inversion of Control by Kent C. Dodds](https://kentcdodds.com/blog/inversion-of-control) - IoC principles

---

_This document is a living document. Please suggest improvements as the codebase evolves._
