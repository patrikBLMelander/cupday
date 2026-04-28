package com.cup.backend.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Auth-related env-driven settings, bound from {@code cup.auth.*} properties. */
@ConfigurationProperties(prefix = "cup.auth")
public record CupAuthProperties(Jwt jwt, Admin admin) {

  public record Jwt(String secret, long ttlSeconds) {}

  public record Admin(String email, String passwordHash) {}
}
