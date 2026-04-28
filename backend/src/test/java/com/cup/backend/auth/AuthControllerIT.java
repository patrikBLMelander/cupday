package com.cup.backend.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.cup.backend.auth.AuthDtos.LoginResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class AuthControllerIT extends AbstractIntegrationTest {

  private static final String EMAIL = "auth-it@example.com";
  private static final String PASSWORD = "secret123";
  private static final String PASSWORD_HASH = new BCryptPasswordEncoder().encode(PASSWORD);

  @DynamicPropertySource
  static void registerAuthProps(DynamicPropertyRegistry registry) {
    registry.add("cup.auth.admin.email", () -> EMAIL);
    registry.add("cup.auth.admin.password-hash", () -> PASSWORD_HASH);
  }

  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper objectMapper;

  @Test
  void loginReturnsTokenAndUser() throws Exception {
    var body = objectMapper.writeValueAsString(
        Map.of("email", EMAIL, "password", PASSWORD));

    mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").exists())
        .andExpect(jsonPath("$.user.email").value(EMAIL));
  }

  @Test
  void loginRejectsBadPassword() throws Exception {
    var body = objectMapper.writeValueAsString(
        Map.of("email", EMAIL, "password", "wrong-password"));

    mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.title").value("Invalid credentials"));
  }

  @Test
  void meWithValidTokenReturnsUser() throws Exception {
    var loginBody = objectMapper.writeValueAsString(
        Map.of("email", EMAIL, "password", PASSWORD));
    var loginResult = mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginBody))
        .andExpect(status().isOk())
        .andReturn();
    var token = objectMapper.readValue(
        loginResult.getResponse().getContentAsString(), LoginResponse.class).token();

    mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.email").value(EMAIL));
  }

  @Test
  void meWithoutTokenIs401() throws Exception {
    mvc.perform(get("/api/auth/me"))
        .andExpect(status().isUnauthorized());
  }
}
