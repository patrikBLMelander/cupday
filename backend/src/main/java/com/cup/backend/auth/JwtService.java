package com.cup.backend.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** Signs and validates HS256 JWT bearer tokens. */
@Service
public class JwtService {

  private static final String CLAIM_EMAIL = "email";

  private final SecretKey signingKey;
  private final long ttlSeconds;
  private final Clock clock;

  @Autowired
  public JwtService(CupAuthProperties properties) {
    this(properties, Clock.systemUTC());
  }

  /** Test-only constructor: injects a fixed clock. */
  JwtService(CupAuthProperties properties, Clock clock) {
    var secret = properties.jwt().secret();
    if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
      throw new IllegalStateException(
          "cup.auth.jwt.secret must be at least 32 bytes for HS256");
    }
    this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.ttlSeconds = properties.jwt().ttlSeconds();
    this.clock = clock;
  }

  /** Build a signed token for the given user. */
  public String issue(User user) {
    var now = clock.instant();
    var expiry = now.plusSeconds(ttlSeconds);
    return Jwts.builder()
        .subject(user.getId().toString())
        .claim(CLAIM_EMAIL, user.getEmail())
        .issuedAt(Date.from(now))
        .expiration(Date.from(expiry))
        .signWith(signingKey, Jwts.SIG.HS256)
        .compact();
  }

  /** Parse and validate a token; returns the user id if valid. */
  public Optional<UUID> parseUserId(String token) {
    return parse(token).map(jws -> UUID.fromString(jws.getPayload().getSubject()));
  }

  private Optional<Jws<Claims>> parse(String token) {
    try {
      var jws = Jwts.parser()
          .verifyWith(signingKey)
          .clock(() -> Date.from(clock.instant()))
          .build()
          .parseSignedClaims(token);
      return Optional.of(jws);
    } catch (JwtException | IllegalArgumentException ex) {
      return Optional.empty();
    }
  }

  /** Exposed for tests so they can stamp expiries deterministically. */
  Instant now() {
    return clock.instant();
  }
}
