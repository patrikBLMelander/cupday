package com.cup.backend.teams;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class RegistrationControllerIT extends AbstractIntegrationTest {

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
  void cleanup() {
    teamRepository.deleteAll();
    registrationRepository.deleteAll();
    cupRepository.deleteAll();
  }

  @Test
  void registersOneTeamAndReturns201() throws Exception {
    var cup = saveOpenCup(8);

    mvc.perform(post("/api/cups/" + cup.getId() + "/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(List.of("IFK Lag 1"))))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.teamIds.length()").value(1));

    assertThat(cupRepository.findById(cup.getId()).orElseThrow().getStatus())
        .isEqualTo(CupStatus.OPEN);
  }

  @Test
  void rejectsCollidingTeamNameWith409AndExtension() throws Exception {
    var cup = saveOpenCup(8);
    mvc.perform(post("/api/cups/" + cup.getId() + "/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(List.of("IFK"))))
        .andExpect(status().isCreated());

    mvc.perform(post("/api/cups/" + cup.getId() + "/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(List.of("ifk"))))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.teamName").value("ifk"));
  }

  @Test
  void rejectsRegistrationWhenCupAtCapacity() throws Exception {
    var cup = saveOpenCup(2);
    mvc.perform(post("/api/cups/" + cup.getId() + "/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(List.of("A", "B"))))
        .andExpect(status().isCreated());

    // Cup should now be FULL.
    assertThat(cupRepository.findById(cup.getId()).orElseThrow().getStatus())
        .isEqualTo(CupStatus.FULL);

    // Further registration is rejected with 422 ("not open" since status flipped).
    mvc.perform(post("/api/cups/" + cup.getId() + "/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(List.of("C"))))
        .andExpect(status().isUnprocessableEntity());
  }

  @Test
  void publicTeamListAndRegistrationLookupBothWork() throws Exception {
    var cup = saveOpenCup(8);
    var createResult = mvc.perform(post("/api/cups/" + cup.getId() + "/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(List.of("IFK Lag 1", "IFK Lag 2"))))
        .andExpect(status().isCreated())
        .andReturn();
    var responseBody = objectMapper.readValue(
        createResult.getResponse().getContentAsString(), Map.class);
    var registrationId = (String) responseBody.get("registrationId");

    mvc.perform(get("/api/cups/" + cup.getId() + "/teams"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].status").value("reserved"));

    mvc.perform(get("/api/registrations/" + registrationId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.registration.id").value(registrationId))
        .andExpect(jsonPath("$.teams.length()").value(2));
  }

  private Cup saveOpenCup(int maxTeams) {
    var cup = new Cup(
        UUID.randomUUID(),
        "test-cup-" + UUID.randomUUID(),
        "Test Cup",
        "IFK Test",
        "220 90% 50%",
        "220 90% 95%",
        LocalDate.of(2026, 6, 1),
        LocalDate.of(2026, 6, 1),
        "Main field",
        2,
        maxTeams,
        100,
        "",
        "",
        "",
        "Patrik",
        "patrik@example.com",
        "0700000000",
        CupStatus.OPEN,
        Instant.now());
    return cupRepository.save(cup);
  }

  private String body(List<String> teamNames) throws Exception {
    var body = new LinkedHashMap<String, Object>();
    body.put("clubName", "IFK");
    body.put("contactName", "Patrik");
    body.put("contactEmail", "patrik@example.com");
    body.put("contactPhone", "0700000000");
    body.put("teamNames", teamNames);
    return objectMapper.writeValueAsString(body);
  }
}
