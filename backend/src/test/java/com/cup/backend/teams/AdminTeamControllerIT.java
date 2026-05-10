package com.cup.backend.teams;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.cup.backend.auth.AuthDtos.LoginResponse;
import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
class AdminTeamControllerIT extends AbstractIntegrationTest {

  private static final String ADMIN_EMAIL = "admin-team-it@example.com";
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

  @Autowired
  TeamRepository teamRepository;

  @Autowired
  RegistrationRepository registrationRepository;

  @BeforeEach
  void clean() {
    teamRepository.deleteAll();
    registrationRepository.deleteAll();
    cupRepository.deleteAll();
  }

  @Test
  void patchWithoutAuthIs401() throws Exception {
    mvc.perform(patch("/api/admin/teams/" + UUID.randomUUID())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"paid\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void listReturnsAllTeamsIncludingCancelled() throws Exception {
    var cup = saveOpenCup(8);
    var token = adminToken();
    var teamIds = registerTwoTeams(cup.getId());

    mvc.perform(patch("/api/admin/teams/" + teamIds.get(1))
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"cancelled\"}"))
        .andExpect(status().isOk());

    var listJson = mvc.perform(get("/api/admin/cups/" + cup.getId() + "/teams")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    var array = objectMapper.readTree(listJson);
    assertThat(array.size()).isEqualTo(2);
    var statusByTeamId = new java.util.HashMap<UUID, String>();
    for (var node : array) {
      statusByTeamId.put(UUID.fromString(node.get("id").asText()), node.get("status").asText());
    }
    assertThat(statusByTeamId.get(teamIds.get(0))).isEqualTo("reserved");
    assertThat(statusByTeamId.get(teamIds.get(1))).isEqualTo("cancelled");
  }

  @Test
  void markPaidStampsPaidAt() throws Exception {
    var cup = saveOpenCup(8);
    var token = adminToken();
    var teamIds = registerTwoTeams(cup.getId());

    mvc.perform(patch("/api/admin/teams/" + teamIds.get(0))
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"paid\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("paid"))
        .andExpect(jsonPath("$.paidAt").exists());
  }

  @Test
  void cancelInFullCupReboundsToOpen() throws Exception {
    var cup = saveOpenCup(2);
    var token = adminToken();
    var teamIds = registerTwoTeams(cup.getId());

    // After registering two teams against maxTeams=2 the cup is full.
    assertThat(cupRepository.findById(cup.getId()).orElseThrow().getStatus())
        .isEqualTo(CupStatus.FULL);

    mvc.perform(patch("/api/admin/teams/" + teamIds.get(0))
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"cancelled\"}"))
        .andExpect(status().isOk());

    assertThat(cupRepository.findById(cup.getId()).orElseThrow().getStatus())
        .isEqualTo(CupStatus.OPEN);
  }

  @Test
  void groupLabelTriStateWorks() throws Exception {
    var cup = saveOpenCup(8);
    var token = adminToken();
    var teamIds = registerTwoTeams(cup.getId());
    var teamId = teamIds.get(0);

    // Set
    mvc.perform(patch("/api/admin/teams/" + teamId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"groupLabel\":\"A\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.groupLabel").value("A"));

    // Clear
    mvc.perform(patch("/api/admin/teams/" + teamId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"groupLabel\":null}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.groupLabel").doesNotExist());

    // Set again
    mvc.perform(patch("/api/admin/teams/" + teamId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"groupLabel\":\"B\"}"))
        .andExpect(status().isOk());

    // Status-only PATCH should leave the group untouched.
    mvc.perform(patch("/api/admin/teams/" + teamId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"paid\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("paid"))
        .andExpect(jsonPath("$.groupLabel").value("B"));
  }

  // Helpers ------------------------------------------------------------------

  private Cup saveOpenCup(int maxTeams) {
    var cup = new Cup(
        UUID.randomUUID(),
        "admin-team-it-" + UUID.randomUUID(),
        "Test", "IFK",
        "0 0% 50%", "0 0% 95%",
        LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 1),
        "Field", 2, maxTeams, 0,
        "", "", "",
        "P", "p@example.com", "0",
        CupStatus.OPEN, Instant.now());
    return cupRepository.save(cup);
  }

  private List<UUID> registerTwoTeams(UUID cupId) throws Exception {
    var body = objectMapper.writeValueAsString(Map.of(
        "clubName", "IFK",
        "contactName", "P",
        "contactEmail", "p@example.com",
        "contactPhone", "0",
        "teamNames", List.of("Lag 1", "Lag 2")));
    var response = mvc.perform(post("/api/cups/" + cupId + "/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isCreated())
        .andReturn()
        .getResponse()
        .getContentAsString();
    var json = objectMapper.readTree(response);
    var ids = json.get("teamIds");
    return List.of(
        UUID.fromString(ids.get(0).asText()),
        UUID.fromString(ids.get(1).asText()));
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
}
