package com.cup.backend.postedcups;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.teams.RegistrationRepository;
import com.cup.backend.teams.TeamRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.test.web.servlet.ResultActions;

@AutoConfigureMockMvc
class PostedCupControllerIT extends AbstractIntegrationTest {

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
  PostedCupRetentionJob retentionJob;

  @BeforeEach
  void cleanup() {
    teamRepository.deleteAll();
    registrationRepository.deleteAll();
    cupRepository.deleteAll();
  }

  @Test
  void multiClassCupRequiresClassAndEnforcesClassLevelSlots() throws Exception {
    var created = createCup(cupBody(4, List.of("P13", "P14"), List.of(slot("P13", "Medel", 2), slot("P14", "Svår", 2))));
    var cupId = created.at("/cup/id").asText();
    var token = created.get("manageToken").asText();
    assertThat(created.at("/cup/slug").asText()).isEqualTo("grimsta-hostcup-2026");
    assertThat(created.at("/cup/publiclyPosted").asBoolean()).isTrue();

    mvc.perform(get("/api/cups/public"))
        .andExpect(jsonPath("$[0].name").value("Grimsta Höstcup 2026"))
        .andExpect(jsonPath("$[0].ageClasses[1]").value("P14"))
        .andExpect(jsonPath("$[0].endTime").value("17:00:00"))
        .andExpect(jsonPath("$[0].hasToilets").value(true))
        .andExpect(jsonPath("$[0].hasParking").value(false));

    register(cupId, "Solna BK", null, "Medel").andExpect(status().isBadRequest());
    register(cupId, "Solna BK", "P13", "Svår").andExpect(status().isBadRequest());
    register(cupId, "Solna BK", "P13", "Medel").andExpect(status().isCreated());
    register(cupId, "Spånga IS", "P13", "Medel").andExpect(status().isCreated());
    register(cupId, "Hässelby SK", "P13", "Medel").andExpect(status().isUnprocessableEntity());

    mvc.perform(get("/api/cups/by-slug/grimsta-hostcup-2026"))
        .andExpect(jsonPath("$.slotQuotas[0].ageClass").value("P13"))
        .andExpect(jsonPath("$.slotQuotas[0].level").value("Medel"))
        .andExpect(jsonPath("$.slotQuotas[0].remaining").value(0))
        .andExpect(jsonPath("$.slotQuotas[1].remaining").value(2));

    mvc.perform(get("/api/cups/" + cupId + "/manage")).andExpect(status().isForbidden());
    var managed = json(mvc.perform(get("/api/cups/" + cupId + "/manage").header("X-Manage-Token", token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.teams.length()").value(2))
        .andExpect(jsonPath("$.teams[0].ageClass").value("P13"))
        .andExpect(jsonPath("$.teams[0].contactEmail").value("anna@example.com"))
        .andReturn().getResponse().getContentAsString());
    var teamId = managed.at("/teams/0/id").asText();

    mvc.perform(patch("/api/cups/" + cupId + "/manage/teams/" + teamId)
            .header("X-Manage-Token", token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"paid\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("paid"));
  }

  @Test
  void slotsMustCoverEveryClassAndAddUpToMaxTeams() throws Exception {
    mvc.perform(post("/api/cups")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(cupBody(8, List.of("P13", "P14"), List.of()))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value("slots are required per age class when the cup has several classes"));

    mvc.perform(post("/api/cups")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(cupBody(8, List.of("P13", "P14"), List.of(slot("P13", null, 4), slot("P14", null, 3))))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value("slots must add up to maxTeams (7 of 8)"));

    var noConsent = cupBody(8, List.of("P13"), List.of());
    noConsent.put("acceptTerms", false);
    mvc.perform(post("/api/cups")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(noConsent)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void externalRegistrationCupRejectsRegistrationsViaDinCup() throws Exception {
    var body = cupBody(8, List.of("P13"), List.of());
    body.put("externalRegistrationUrl", "https://example.com/anmalan");
    var cupId = createCup(body).at("/cup/id").asText();

    register(cupId, "Solna BK", null, null).andExpect(status().isUnprocessableEntity());
  }

  @Test
  void retentionDeletesPostedCupsLongAfterTheLastDay() throws Exception {
    var cupId = UUID.fromString(createCup(cupBody(8, List.of("P13"), List.of())).at("/cup/id").asText());
    var cup = cupRepository.findById(cupId).orElseThrow();
    cup.setStartDate(LocalDate.now().minusDays(40));
    cup.setEndDate(LocalDate.now().minusDays(31));
    cupRepository.save(cup);

    assertThat(retentionJob.purgeExpired()).isEqualTo(1);
    assertThat(cupRepository.findById(cupId)).isEmpty();
  }

  private JsonNode createCup(Map<String, Object> body) throws Exception {
    return json(mvc.perform(post("/api/cups")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString());
  }

  private ResultActions register(String cupId, String team, String ageClass, String level) throws Exception {
    var body = new LinkedHashMap<String, Object>();
    body.put("clubName", team);
    body.put("contactName", "Anna");
    body.put("contactEmail", "anna@example.com");
    body.put("contactPhone", "0700");
    body.put("teamNames", List.of(team));
    if (level != null) {
      body.put("teamLevels", List.of(level));
    }
    if (ageClass != null) {
      body.put("teamAgeClasses", List.of(ageClass));
    }
    return mvc.perform(post("/api/cups/" + cupId + "/registrations")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(body)));
  }

  private JsonNode json(String body) throws Exception {
    return objectMapper.readTree(body);
  }

  private static Map<String, Object> slot(String ageClass, String level, int maxTeams) {
    var slot = new LinkedHashMap<String, Object>();
    slot.put("ageClass", ageClass);
    slot.put("level", level);
    slot.put("maxTeams", maxTeams);
    return slot;
  }

  private static Map<String, Object> cupBody(int maxTeams, List<String> classes, List<Map<String, Object>> slots) {
    var start = LocalDate.now().plusDays(14);
    var body = new LinkedHashMap<String, Object>();
    body.put("name", "Grimsta Höstcup 2026");
    body.put("organizingClubName", "Västerort FF");
    body.put("startDate", start.toString());
    body.put("endDate", start.plusDays(1).toString());
    body.put("startTime", "09:00");
    body.put("endTime", "17:00");
    body.put("venueName", "Grimsta IP");
    body.put("ageClasses", classes);
    body.put("playersPerTeam", 7);
    body.put("levelMin", 5);
    body.put("levelMax", 8);
    body.put("maxTeams", maxTeams);
    body.put("registrationFeeSek", 1200);
    body.put("registrationDeadline", start.minusDays(7).toString());
    body.put("paymentLink", "https://lagkassan.se/betala/vff");
    body.put("paymentInstructions", "Swisha till 123");
    body.put("slots", slots);
    body.put("contactName", "Anna Berg");
    body.put("contactPhone", "070-123 45 67");
    body.put("contactEmail", "anna@vff.se");
    body.put("hasToilets", true);
    body.put("hasFood", true);
    body.put("acceptTerms", true);
    return body;
  }
}
