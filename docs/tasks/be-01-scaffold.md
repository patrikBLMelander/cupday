# Task BE-01 — Backend Scaffold

## Goal

Stand up the empty Spring Boot service so every later backend feature has a working home. After this task, `docker compose up` boots a Postgres + backend stack, the backend serves `GET /api/health`, Flyway has run a baseline migration, one integration test passes against a Testcontainers Postgres, and `mvn install` builds a runnable jar.

This is a **manual one-shot** like the frontend scaffold — not run via `/implement-backend`. The skill is for feature work; the scaffold is too cross-cutting to fit cleanly into the analyze → plan → implement loop.

## Scope

1. Maven project under `backend/` — `pom.xml`, standard Spring Boot layout.
2. Spring Boot 3 + Java 21 dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `flyway-core`, `flyway-database-postgresql`, `postgresql`, `spring-boot-starter-actuator` (for the healthcheck), `spring-boot-starter-test`, `testcontainers` BOM + `testcontainers-postgresql`.
3. `src/main/resources/application.properties` with Postgres + Flyway config driven by env vars (`DB_URL`, `DB_USER`, `DB_PASSWORD`).
4. Baseline Flyway migration `V1__baseline.sql` — empty schema for now (later tasks add tables).
5. `HealthController` exposing `GET /api/health` returning `{ "status": "ok" }`.
6. Multi-stage `Dockerfile` (build stage on `maven:3.9-eclipse-temurin-21`, run stage on `eclipse-temurin:21-jre-alpine`).
7. `docker-compose.yml` at repo root with `postgres` + `backend` services and a named volume for Postgres data.
8. `.dockerignore` to keep image size sane.
9. One integration test `HealthControllerIT` using `@SpringBootTest` + Testcontainers Postgres asserting `GET /api/health` returns 200.

## Out of scope

- Auth, JWT, security config — Task BE-02.
- Domain entities — added by their respective tasks (BE-02 onward).
- Production-grade logging config beyond Spring's defaults.
- Multi-environment property profiles. One `application.properties` is enough; env vars override.
- Maven wrapper (`./mvnw`). User has `mvnd` / `mvn` available globally per nano experience.

## Layout

```
cup/
  backend/
    pom.xml
    Dockerfile
    .dockerignore
    src/
      main/
        java/com/cup/backend/
          CupBackendApplication.java
          health/
            HealthController.java
        resources/
          application.properties
          db/migration/
            V1__baseline.sql
      test/
        java/com/cup/backend/
          AbstractIntegrationTest.java   # Testcontainers base class
          health/
            HealthControllerIT.java
docker-compose.yml                      # repo root
.env.example                             # repo root, documents required vars
```

## Dependencies (`pom.xml`)

- `spring-boot-starter-parent` 3.3.x as parent.
- `java.version` = 21.
- Starters: `web`, `data-jpa`, `validation`, `actuator`, `test`.
- DB: `flyway-core`, `flyway-database-postgresql`, `org.postgresql:postgresql`.
- Testcontainers: `testcontainers-bom` import, `testcontainers-postgresql` + `testcontainers-junit-jupiter`.
- Plugins: `spring-boot-maven-plugin` (default), `maven-failsafe-plugin` (so `*IT.java` runs in the integration phase), `maven-surefire-plugin` (already inherited).

Per `CODE_STANDARD.md` — 2-space indent in any code we write here too. POM follows Maven's natural 2-space indent.

## `application.properties`

```properties
spring.application.name=cup-backend

# Datasource: env-driven; sensible defaults for local Compose.
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/cup}
spring.datasource.username=${DB_USER:cup}
spring.datasource.password=${DB_PASSWORD:cup}

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation=true

spring.flyway.locations=classpath:db/migration

server.port=${PORT:8080}
management.endpoints.web.exposure.include=health
management.endpoint.health.probes.enabled=true
```

Notes:
- `ddl-auto=validate` so Flyway is the only schema authority.
- `open-in-view=false` (best-practice; avoids subtle lazy-loading bugs in controllers).
- `PORT` env var honoured (Railway sets it).

## Baseline migration `V1__baseline.sql`

Empty file with a comment — Flyway just needs *some* baseline applied so tracking starts cleanly. Later tasks add real tables in `V2__...`, `V3__...`.

```sql
-- Baseline migration. Subsequent tasks add the real schema.
SELECT 1;
```

## Healthcheck

```java
package com.cup.backend.health;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }
}
```

The Spring Actuator endpoint at `/actuator/health` exists too (used by Railway / Docker), but the public `/api/health` is the one the frontend (and developers) will hit.

## Dockerfile (backend, multi-stage)

```dockerfile
# syntax=docker/dockerfile:1.7

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /workspace/target/*.jar /app/cup-backend.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/cup-backend.jar"]
```

`.dockerignore`:
```
target/
.idea/
*.iml
.git/
.gitignore
```

## `docker-compose.yml` (repo root)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: cup
      POSTGRES_PASSWORD: cup
      POSTGRES_DB: cup
    ports:
      - "5432:5432"
    volumes:
      - cup-postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cup -d cup"]
      interval: 5s
      timeout: 3s
      retries: 10

  backend:
    build:
      context: ./backend
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/cup
      DB_USER: cup
      DB_PASSWORD: cup
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  cup-postgres:
```

## `.env.example` (repo root)

```
# Local dev defaults — Compose uses these implicitly.
DB_URL=jdbc:postgresql://localhost:5432/cup
DB_USER=cup
DB_PASSWORD=cup

# Auth (placeholder values; Task BE-02 introduces real ones).
CUP_ADMIN_EMAIL=admin@example.com
CUP_ADMIN_PASSWORD_HASH=$2a$10$placeholderHash
JWT_SECRET=please-rotate-me-256-bits
JWT_TTL_SECONDS=86400
```

## Test wiring

`AbstractIntegrationTest` boots a Postgres Testcontainer and points Spring at it via dynamic `@DynamicPropertySource`. All `*IT.java` tests extend this base.

```java
package com.cup.backend;

import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
public abstract class AbstractIntegrationTest {

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("cup")
          .withUsername("cup")
          .withPassword("cup");

  @DynamicPropertySource
  static void registerDatasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }
}
```

`HealthControllerIT.java`:

```java
package com.cup.backend.health;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class HealthControllerIT extends AbstractIntegrationTest {

  @Autowired
  MockMvc mockMvc;

  @Test
  void respondsWithStatusOk() throws Exception {
    mockMvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"));
  }
}
```

## Verification at the end of the scaffold

From `backend/`:
- `mvn -B compile` succeeds.
- `mvn -B test` runs unit tests (none yet); exits clean.
- `mvn -B verify` runs `*IT` tests via failsafe; the health test passes against Testcontainers Postgres.
- `mvn -B package` produces `target/cup-backend-0.0.1-SNAPSHOT.jar`.

From repo root:
- `docker compose up --build` builds the backend image, starts Postgres + backend, and `curl http://localhost:8080/api/health` returns `{"status":"ok"}`.

## Risks / notes

- **Docker daemon required for Testcontainers.** If running tests in a CI without Docker, they'll fail — accepted MVP risk; user develops locally with Docker available.
- **Java 21 toolchain.** Verify `java -version` shows 21+. If not, install via `brew install openjdk@21` (Mac).
- **Maven daemon.** `mvnd` is preferred per `CODE_STANDARD.md`. The Maven CLI commands above all work with `mvnd` as a drop-in replacement.
- **Empty baseline migration** — Flyway accepts a no-op `SELECT 1`. Some teams use `V0__baseline.sql` instead; we go with `V1` since later migrations will be `V2`, `V3`, etc.
- **`ddl-auto=validate`** — won't pass until at least one entity exists with a corresponding table. For the scaffold, no entities yet, so validation is a no-op. The healthcheck test passes anyway because it doesn't touch JPA.
- **`open-in-view=false` warning silencing** — Spring logs a friendly nudge by default; we set the property explicitly so the log is quiet.
- **`.env.example` placeholder hash** is *not* a working bcrypt hash; Task BE-02 generates a real one. We surface the variable now so anyone reading the repo knows what to set later.

## Acceptance criteria

- [ ] `backend/` contains the Maven project layout above.
- [ ] `docker compose up --build` brings up Postgres + backend; `curl http://localhost:8080/api/health` returns 200 with `{"status":"ok"}`.
- [ ] `cd backend && mvn verify` runs the integration test against Testcontainers Postgres; test passes.
- [ ] `cd backend && mvn package` produces a jar in `target/`.
- [ ] Frontend gates remain green (`cd frontend && npm run build`).
- [ ] `.env.example` is committed; secrets aren't.
- [ ] All Java code follows `CODE_STANDARD.md`: 2-space indent, K&R braces, LF line endings, constructor injection, no field injection.
