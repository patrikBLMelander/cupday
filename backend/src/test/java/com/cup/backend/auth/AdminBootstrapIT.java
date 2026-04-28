package com.cup.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.cup.backend.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

class AdminBootstrapIT extends AbstractIntegrationTest {

  private static final String EMAIL = "bootstrap-it@example.com";
  private static final String PASSWORD_HASH = new BCryptPasswordEncoder().encode("secret123");

  @DynamicPropertySource
  static void registerAuthProps(DynamicPropertyRegistry registry) {
    registry.add("cup.auth.admin.email", () -> EMAIL);
    registry.add("cup.auth.admin.password-hash", () -> PASSWORD_HASH);
  }

  @Autowired
  UserRepository userRepository;

  @Test
  void adminUserIsUpsertedOnStartup() {
    assertThat(userRepository.findByEmailIgnoreCase(EMAIL))
        .hasValueSatisfying(user ->
            assertThat(user.getPasswordHash()).isEqualTo(PASSWORD_HASH));
  }
}
