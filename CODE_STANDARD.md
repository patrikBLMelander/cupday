# Java Code Standard

Single source of truth for all Java/Spring Boot coding standards in this project.

Based on the [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html) with project-specific exceptions and additions.

**Scope:** Apply these standards to **new and modified code only**. Do not refactor existing code to match unless directly required by the task.

---

## Build Commands

Prefer `mvnd` (Maven Daemon) over `mvn` — it is significantly faster. If `mvnd` is unavailable, use `mvn -T 1C` (1 thread per CPU core) for parallel builds.

> **TODO:** Fill in project-specific build/test commands once the build setup is in place.

```bash
# Build (skip tests)
mvnd install -DskipTests

# Run all tests
mvnd test

# Run a single test class
mvnd test -Dtest=TestClassName

# Run a single test method
mvnd test -Dtest=TestClassName#testMethodName
```

---

## Formatting

All formatting rules are defined in `.editorconfig.template` (repo root). Key rules:

- **2-space indentation** for Java (NOT 4 spaces) — `indent_size = 2`, `tab_width = 2`
- **Spaces, not tabs** — `indent_style = space`
- **LF line endings** — `end_of_line = lf` (never CRLF). All new files must use LF.
- **UTF-8** — `charset = utf-8`
- **No final newline** — `insert_final_newline = false`
- **Trim trailing whitespace** — `trim_trailing_whitespace = true`
- **Line length** — max 120 characters
- **Opening braces on same line** — K&R style (`class Foo {`, not `class Foo\n{`)
- **Always use braces** for `if`, `for`, `while`, `do-while` — even single-line bodies
- **Import order** — static imports first, blank line, then regular imports (`$*,|,*`)
- **Wildcard imports** — use `*` after 2 classes from the same package (`ij_java_class_count_to_use_import_on_demand = 2`)
- **4-space continuation indent** — `ij_continuation_indent_size = 4`
- **Each annotation on its own line** for classes, methods, and fields (`split_into_lines`)
- **Whitespace** — one space after commas, colons, and semicolons. No extra spaces before parentheses in method calls.
- **Arrays** — `int[] nums`, not `int nums[]`

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes & Interfaces | UpperCamelCase | `MyClass`, `DataParser` |
| Methods | lowerCamelCase | `calculateTotal()` |
| Variables | lowerCamelCase | `userCount` |
| Constants (`static final`) | UPPER_SNAKE_CASE | `MAX_VALUE` |
| Packages | all lowercase, no underscores | `com.cubeia.nano` |
| Properties (`application*.properties`) | kebab-case with dots | `com.cubeia.nano.integration.hub88-example-value` |

Use descriptive names — no C-style abbreviations (`amt` -> `amount`, `usr` -> `user`, `cnt` -> `count`).

---

## Javadoc

Add short, concise Javadoc on new public methods. One-liner `/** Does X. */` is fine — don't over-document. Skip Javadoc on getters/setters, trivial delegations, and test methods. Use `@Override` on all overriding methods.

---

## Testing

Always test new code, but keep tests **proportional** to the size and complexity of the change. Cover the happy path and the most important failure case — don't exhaustively test every edge case, boundary condition, or permutation. A small feature should not produce more test code than production code. Update existing test files rather than creating new ones when possible.

Mock `when`-behavior per test method — do not place lenient stubs in `@BeforeEach`.

---

## Constructor Injection

**New classes must use constructor injection** with `private final` fields and an explicit constructor. Never use field injection (`@Inject`, `@Autowired` on fields) in new classes. Do not annotate the constructor with `@Inject` or `@Autowired` — Spring handles single-constructor injection automatically.

```java
// Good
@Service
public class FooBarService {

  private final FooService fooService;
  private final BarService barService;

  public FooBarService(FooService fooService, BarService barService) {
    this.fooService = fooService;
    this.barService = barService;
  }
}

// Bad — field injection
@Service
public class FooBarService {
  @Inject FooService fooService;
  @Inject BarService barService;
}
```

When modifying existing files that use field injection, follow their current style to keep consistency within the file.

---

## String Formatting

Use `.formatted()` or `String.format()` instead of string concatenation:

```java
// Good
var message = "Hello %s, you have %d items".formatted(name, count);

// Bad
var message = "Hello " + name + ", you have " + count + " items";
```

Use parameterized logging — never concatenate log messages:

```java
// Good
log.info("Processing user {} with {} items", userId, count);

// Bad
log.info("Processing user " + userId + " with " + count + " items");
```

Do not coerce to string using empty-string concatenation. Use `String.valueOf()`:

```java
// Good
String value = String.valueOf(variable);

// Bad
String value = variable + "";
```

---

## Spring Configuration

- Prefer `@ConfigurationProperties(prefix = "...")` over `@Value`
- Use builders instead of setters when possible
- Properties values in `application*.properties` should only use kebab-case and dots

---

## Streams & Lambdas

- **Streams over loops** — prefer `stream()`, `map()`, `filter()` over imperative `for` loops for transformations and filtering
- **`.toList()` over `collect(Collectors.toList())`** — use the built-in `.toList()` terminal operation
- **Method references over lambdas** — prefer `User::getName` over `u -> u.getName()` when the reference is clear and readable
- **Lambdas must be one-liners** — if a lambda needs multiple statements or a `return`, extract it into a named private method and use a method reference

---

## Modern Language Features

- **Pattern matching** — use `instanceof` pattern matching (`if (obj instanceof String s)`) instead of explicit casts
- **Switch expressions** — use arrow-style switch expressions with exhaustiveness checks instead of traditional switch statements
- **Records for DTOs** — prefer `record` for immutable data carriers (DTOs, event payloads, value objects)
- **Sealed interfaces** — use `sealed` interfaces/classes when a type hierarchy is closed and known
- **Text blocks** — use `"""` text blocks for multi-line strings (SQL, JSON, messages)
- **`var` for local variables** — use `var` when the type is obvious from the right-hand side (e.g., `var users = new ArrayList<User>()`)

---

## Optional API

- Return `Optional<T>` instead of nullable types for query methods
- **Never** use `optional.get()` — always use `orElseThrow()`, `orElse()`, or `orElseGet()`
- **Never** use `if (optional.isPresent()) { ... } else { ... }` — use `optional.ifPresentOrElse()`
- Prefer fluent chains: `optional.map()`, `optional.flatMap()`, `optional.filter()`, `optional.orElseGet()`
- Use `optional.ifPresent()` for side-effect-only operations

---

## Collections & Constants

- **`List.getFirst()` / `getLast()`** — use sequenced collection methods instead of `list.get(0)` or `list.get(list.size() - 1)`
- **`List.of()`, `Map.of()`, `Set.of()`** — prefer over `Arrays.asList()` or manual construction
- **No magic numbers** — extract numeric and string literals into named constants or enums. Exception: obvious values like `0`, `1`, empty string
- **Immutability** — prefer unmodifiable collections (`List.copyOf()`, `Collections.unmodifiable*`) and final fields

---

## Data-Oriented Design

Prefer a data-oriented approach over traditional OOP polymorphism for **new** domain modeling. Model data as plain, transparent carriers and keep behavior in services:

- **Sealed types + records for domain variants** — data types carry data only, no business logic:
  ```java
  sealed interface Reward permits CashReward, BonusReward, FreeSpinReward {
      BigDecimal value();
  }
  record CashReward(BigDecimal value, Currency currency) implements Reward {}
  record BonusReward(BigDecimal value, int turnoverMultiplier) implements Reward {}
  record FreeSpinReward(BigDecimal value, int spins, String gameId) implements Reward {}
  ```

- **Pattern matching switches in services, not polymorphic methods on types:**
  ```java
  // Good — logic in service, data types stay clean
  public Transaction processReward(Reward reward, long userId) {
      return switch (reward) {
          case CashReward r -> walletClient.credit(userId, r.value(), r.currency());
          case BonusReward r -> bonusClient.createBonus(userId, r.value(), r.turnoverMultiplier());
          case FreeSpinReward r -> providerClient.grantFreeSpins(userId, r.spins(), r.gameId());
      };
  }

  // Bad — business logic on the data type
  sealed interface Reward {
      Transaction process(long userId); // avoid this
  }
  ```

- **Exhaustive switches as compile-time safety** — when a new variant is added to a sealed type, every switch that handles it will fail to compile
- **Enums for simple fixed sets, sealed types for data-carrying variants**
- **Don't fight the codebase** — when modifying existing OOP hierarchies (abstract classes, interface polymorphism), follow the existing pattern. Apply data-oriented design to new type hierarchies only

---

## Multi-Pod Safety & Scalability

Code runs on multiple Kubernetes pods concurrently. Every new feature must be safe under concurrent execution:

- **ShedLock on all scheduled jobs** — every `@Scheduled` method must use `@SchedulerLock` to prevent duplicate execution across pods
- **No in-memory state sharing** — don't rely on static mutable state, local caches without Redis, or in-JVM singletons for cross-request coordination. Use Redis or the database as the shared state layer
- **Optimistic locking for contested writes** — use `@Version` on JPA entities that may be updated concurrently. Avoid read-then-write patterns without a lock or version check
- **Idempotent event handlers** — RabbitMQ may deliver events more than once. Handlers must be idempotent (use deduplication keys, `INSERT ... ON DUPLICATE KEY UPDATE`, or check-before-write)
- **Batch processing for large datasets** — never load unbounded result sets into memory. Use pagination (`Pageable`), streaming (`Stream<T>` with `@Transactional(readOnly = true)`), or cursor-based iteration for large queries
- **Efficient queries** — avoid N+1 query patterns. Use `@EntityGraph`, `JOIN FETCH`, or projection DTOs for bulk reads. Check that new queries have appropriate indexes
- **No distributed race conditions** — when multiple pods might perform the same write (e.g., creating a bonus award on an event), use database constraints (unique indexes), distributed locks (Redis/ShedLock), or compare-and-swap patterns
- **Connection pool awareness** — long-running operations should not hold DB connections unnecessarily. Break large transactions into smaller chunks where possible

---

## Immutability Policy

All new code should be immutable-by-default:

- Prefer immutable value objects with `final` fields and no setters (use records when possible)
- Initialize all fields via constructors or builders
- Expose unmodifiable views or defensive copies of collections
- Avoid sharing mutable state across threads

Pragmatic exceptions: JPA entities and frameworks requiring no-args constructors or setters. In those cases, keep mutable scope minimal and encapsulated.

---

## Methods

- A method should do one thing
- Keep methods as functional as possible — the same input should return the same result with minimal side effects
- Prefer flat control flow — early returns over deeply nested if/else