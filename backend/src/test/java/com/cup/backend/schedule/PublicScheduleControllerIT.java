package com.cup.backend.schedule;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.cup.backend.teams.GroupLabel;
import com.cup.backend.teams.Registration;
import com.cup.backend.teams.RegistrationRepository;
import com.cup.backend.teams.Team;
import com.cup.backend.teams.TeamRepository;
import com.cup.backend.teams.TeamStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class PublicScheduleControllerIT extends AbstractIntegrationTest {

  @Autowired
  MockMvc mvc;

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
  void listReturnsMatchesSortedAndUnknownCupReturns404() throws Exception {
    var cup = saveCup();
    var registration = registrationRepository.save(
        new Registration(UUID.randomUUID(), cup.getId(), Instant.now()));
    var home = teamRepository.save(team(cup.getId(), registration.getId(), "Home"));
    var away = teamRepository.save(team(cup.getId(), registration.getId(), "Away"));
    var laterStart = Instant.parse("2026-06-01T10:30:00Z");
    var earlierStart = Instant.parse("2026-06-01T10:00:00Z");

    matchRepository.save(new Match(
        UUID.randomUUID(), cup.getId(), GroupLabel.A, 1,
        laterStart, home.getId(), away.getId()));
    matchRepository.save(new Match(
        UUID.randomUUID(), cup.getId(), GroupLabel.A, 1,
        earlierStart, home.getId(), away.getId()));

    mvc.perform(get("/api/cups/" + cup.getId() + "/matches"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].startTime").value(earlierStart.toString()))
        .andExpect(jsonPath("$[1].startTime").value(laterStart.toString()));

    mvc.perform(get("/api/cups/" + UUID.randomUUID() + "/matches"))
        .andExpect(status().isNotFound());
  }

  private Cup saveCup() {
    var cup = new Cup(
        UUID.randomUUID(),
        "public-schedule-it-" + UUID.randomUUID(),
        "Test", "IFK",
        "0 0% 50%", "0 0% 95%",
        LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 1),
        "Field", 2, 8, 0,
        "", "", "",
        "P", "p@example.com", "0",
        CupStatus.SCHEDULED, Instant.now());
    return cupRepository.save(cup);
  }

  private Team team(UUID cupId, UUID registrationId, String name) {
    return new Team(
        UUID.randomUUID(), cupId, registrationId,
        name, "Club", "C", "c@example.com", "0",
        GroupLabel.A, TeamStatus.PAID, Instant.now());
  }
}
