package com.cup.backend.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.cup.backend.auth.AuthDtos.LoginResponse;
import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.cup.backend.teams.GroupLabel;
import com.cup.backend.teams.Registration;
import com.cup.backend.teams.RegistrationRepository;
import com.cup.backend.teams.Team;
import com.cup.backend.teams.TeamRepository;
import com.cup.backend.teams.TeamStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
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
class AdminScheduleControllerIT extends AbstractIntegrationTest {

  private static final String ADMIN_EMAIL = "schedule-it@example.com";
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

  @Autowired
  MatchRepository matchRepository;

  @BeforeEach
  void clean() {
    matchRepository.deleteAll();
    teamRepository.deleteAll();
    registrationRepository.deleteAll();
    cupRepository.deleteAll();
  }

  @Test
  void generateProducesTwelveMatchesAndFlipsCupToScheduled() throws Exception {
    var cup = saveOpenCupWithFourPaidTeamsPerGroup();
    var token = adminToken();

    mvc.perform(post("/api/admin/cups/" + cup.getId() + "/schedule/generate")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(generateBody()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(12));

    assertThat(cupRepository.findById(cup.getId()).orElseThrow().getStatus())
        .isEqualTo(CupStatus.SCHEDULED);
    assertThat(matchRepository.findByCupIdOrderByStartTimeAsc(cup.getId())).hasSize(12);
  }

  @Test
  void generateRejectsWhenPaidCountsAreNotFourFour() throws Exception {
    var cup = saveOpenCup(8);
    seedPaidTeams(cup.getId(), GroupLabel.A, 4);
    seedPaidTeams(cup.getId(), GroupLabel.B, 3);
    var token = adminToken();

    mvc.perform(post("/api/admin/cups/" + cup.getId() + "/schedule/generate")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(generateBody()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.title").value("Schedule requirements not met"));
  }

  @Test
  void generateRejectsWhenCupIsDraft() throws Exception {
    var cup = saveOpenCup(8);
    cup.setStatus(CupStatus.DRAFT);
    cupRepository.save(cup);
    var token = adminToken();

    mvc.perform(post("/api/admin/cups/" + cup.getId() + "/schedule/generate")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(generateBody()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.title").value("Cup not ready"));
  }

  // Helpers ------------------------------------------------------------------

  private Cup saveOpenCup(int maxTeams) {
    var cup = new Cup(
        UUID.randomUUID(),
        "schedule-it-" + UUID.randomUUID(),
        "Test", "IFK",
        "0 0% 50%", "0 0% 95%",
        LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 1),
        "Field", 2, maxTeams, 0,
        "", "", "",
        "P", "p@example.com", "0",
        CupStatus.OPEN, Instant.now());
    return cupRepository.save(cup);
  }

  private Cup saveOpenCupWithFourPaidTeamsPerGroup() {
    var cup = saveOpenCup(8);
    seedPaidTeams(cup.getId(), GroupLabel.A, 4);
    seedPaidTeams(cup.getId(), GroupLabel.B, 4);
    return cup;
  }

  private void seedPaidTeams(UUID cupId, GroupLabel groupLabel, int count) {
    var registration = registrationRepository.save(
        new Registration(UUID.randomUUID(), cupId, Instant.now()));
    for (int i = 0; i < count; i++) {
      var team = new Team(
          UUID.randomUUID(),
          cupId,
          registration.getId(),
          groupLabel.name() + (i + 1) + "-" + UUID.randomUUID(),
          "Club",
          "Contact",
          "c@example.com",
          "0700",
          groupLabel,
          TeamStatus.PAID,
          Instant.now());
      team.setPaidAt(Instant.now());
      teamRepository.save(team);
    }
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

  private String generateBody() throws Exception {
    var body = new LinkedHashMap<String, Object>();
    body.put("startTime", "2026-06-01T08:00:00Z");
    body.put("matchDurationMinutes", 15);
    body.put("breakBetweenMatchesMinutes", 5);
    return objectMapper.writeValueAsString(body);
  }
}
