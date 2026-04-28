package com.cup.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

  private static final String SECRET = "test-secret-please-rotate-32bytes!!";
  private static final long TTL_SECONDS = 3600;

  private static final User ADMIN = new User(
      UUID.fromString("00000000-0000-0000-0000-000000000001"),
      "admin@example.com",
      "$2a$10$dummy",
      Instant.parse("2026-01-01T10:00:00Z"));

  private static JwtService service(Clock clock) {
    var props = new CupAuthProperties(
        new CupAuthProperties.Jwt(SECRET, TTL_SECONDS),
        new CupAuthProperties.Admin("ignored", "ignored"));
    return new JwtService(props, clock);
  }

  @Test
  void roundTripsAUserId() {
    var clock = Clock.fixed(Instant.parse("2026-04-27T10:00:00Z"), ZoneOffset.UTC);
    var jwt = service(clock);

    var token = jwt.issue(ADMIN);

    assertThat(jwt.parseUserId(token)).contains(ADMIN.getId());
  }

  @Test
  void rejectsTamperedTokens() {
    var clock = Clock.fixed(Instant.parse("2026-04-27T10:00:00Z"), ZoneOffset.UTC);
    var jwt = service(clock);

    var token = jwt.issue(ADMIN);
    var tampered = token.substring(0, token.length() - 4) + "AAAA";

    assertThat(jwt.parseUserId(tampered)).isEmpty();
  }

  @Test
  void rejectsExpiredTokens() {
    var issuingClock = Clock.fixed(Instant.parse("2026-04-27T10:00:00Z"), ZoneOffset.UTC);
    var token = service(issuingClock).issue(ADMIN);

    var laterClock = Clock.fixed(Instant.parse("2026-04-27T12:00:01Z"), ZoneOffset.UTC);
    assertThat(service(laterClock).parseUserId(token)).isEmpty();
  }
}
