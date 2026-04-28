package com.cup.backend.cups;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.cup.backend.auth.AuthDtos.LoginResponse;
import com.cup.backend.cups.CupDtos.CupResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class CupControllerIT extends AbstractIntegrationTest {

  private static final String ADMIN_EMAIL = "cup-it@example.com";
  private static final String ADMIN_PASSWORD = "secret123";
  private static final String ADMIN_HASH = new BCryptPasswordEncoder().encode(ADMIN_PASSWORD);

  @DynamicPropertySource
  static void registerAuthProps(DynamicPropertyRegistry registry) {
    registry.add("cup.auth.admin.email", () -> ADMIN_EMAIL);
    registry.add("cup.auth.admin.password-hash", () -> ADMIN_HASH);
  }

  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper objectMapper;

  @Autowired
  CupRepository cupRepository;

  @BeforeEach
  void cleanCups() {
    cupRepository.deleteAll();
  }

  @Test
  void postWithoutAuthIs401() throws Exception {
    mvc.perform(post("/api/admin/cups")
            .contentType(MediaType.APPLICATION_JSON)
            .content(validCreateBody()))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void createListGetRoundTrip() throws Exception {
    var token = adminToken();

    var createResult = mvc.perform(post("/api/admin/cups")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(validCreateBody()))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("draft"))
        .andExpect(jsonPath("$.slug").value("test-cup"))
        .andReturn();
    var created = objectMapper.readValue(
        createResult.getResponse().getContentAsString(), CupResponse.class);

    mvc.perform(get("/api/admin/cups").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(created.id().toString()));

    mvc.perform(get("/api/admin/cups/" + created.id())
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.slug").value("test-cup"));
  }

  @Test
  void deleteThenGetReturns404() throws Exception {
    var token = adminToken();
    var createResult = mvc.perform(post("/api/admin/cups")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(validCreateBody()))
        .andExpect(status().isCreated())
        .andReturn();
    var created = objectMapper.readValue(
        createResult.getResponse().getContentAsString(), CupResponse.class);

    mvc.perform(delete("/api/admin/cups/" + created.id())
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mvc.perform(get("/api/admin/cups/" + created.id())
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNotFound());
  }

  private String adminToken() throws Exception {
    var body = objectMapper.writeValueAsString(
        Map.of("email", ADMIN_EMAIL, "password", ADMIN_PASSWORD));
    var result = mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk())
        .andReturn();
    return objectMapper.readValue(
        result.getResponse().getContentAsString(), LoginResponse.class).token();
  }

  private String validCreateBody() throws Exception {
    var body = new LinkedHashMap<String, Object>();
    body.put("slug", "test-cup");
    body.put("name", "Test Cup");
    body.put("organizingClubName", "IFK Test");
    body.put("organizingClubColors", Map.of("primary", "220 90% 50%", "accent", "220 90% 95%"));
    body.put("startDate", "2026-06-01");
    body.put("endDate", "2026-06-01");
    body.put("venueName", "Main field");
    body.put("pitchCount", 2);
    body.put("maxTeams", 8);
    body.put("registrationFeeSek", 100);
    body.put("paymentInstructions", "");
    body.put("paymentLagkassanLink", "");
    body.put("paymentLagkassanQrUrl", "");
    body.put("organizerContactName", "Patrik");
    body.put("organizerContactEmail", "patrik@example.com");
    body.put("organizerContactPhone", "0700000000");
    return objectMapper.writeValueAsString(body);
  }
}
