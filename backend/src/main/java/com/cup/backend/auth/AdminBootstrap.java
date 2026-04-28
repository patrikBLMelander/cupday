package com.cup.backend.auth;

import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * On startup, upserts the admin user from {@code CUP_ADMIN_EMAIL} +
 * {@code CUP_ADMIN_PASSWORD_HASH}. Skips with a warning if either value is
 * missing or malformed so non-auth flows still boot.
 */
@Component
public class AdminBootstrap {

  private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

  private final CupAuthProperties properties;
  private final UserRepository userRepository;

  public AdminBootstrap(CupAuthProperties properties, UserRepository userRepository) {
    this.properties = properties;
    this.userRepository = userRepository;
  }

  @EventListener(ApplicationReadyEvent.class)
  @Transactional
  public void upsertAdmin() {
    var email = properties.admin().email();
    var hash = properties.admin().passwordHash();
    if (email == null || email.isBlank() || hash == null || hash.isBlank()) {
      log.warn("Admin credentials not set (CUP_ADMIN_EMAIL / CUP_ADMIN_PASSWORD_HASH); skipping bootstrap");
      return;
    }
    var normalizedHash = normalizeBcryptPrefix(hash);
    if (!isBcryptHash(normalizedHash)) {
      log.warn("CUP_ADMIN_PASSWORD_HASH is not a valid bcrypt hash; skipping bootstrap");
      return;
    }

    userRepository.findByEmailIgnoreCase(email).ifPresentOrElse(
        existing -> {
          if (!existing.getPasswordHash().equals(normalizedHash)) {
            existing.setPasswordHash(normalizedHash);
            log.info("Updated admin password hash for {}", email);
          }
        },
        () -> {
          var user = new User(UUID.randomUUID(), email, normalizedHash, Instant.now());
          userRepository.save(user);
          log.info("Created admin user {}", email);
        });
  }

  private static String normalizeBcryptPrefix(String hash) {
    return hash.startsWith("$2y$") ? "$2a$" + hash.substring(4) : hash;
  }

  private static boolean isBcryptHash(String hash) {
    return hash.length() == 60 && (hash.startsWith("$2a$") || hash.startsWith("$2b$"));
  }
}
