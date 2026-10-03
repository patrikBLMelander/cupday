package com.cup.backend.practicematches;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class PracticeMatchControllerIT extends AbstractIntegrationTest {

  private static final String BASE = "/api/practice-matches";

  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper objectMapper;

  @Autowired
  PracticeMatchRepository matchRepository;

  @Autowired
  PracticeMatchBookingRepository bookingRepository;

  @BeforeEach
  void cleanup() {
    bookingRepository.deleteAll();
    matchRepository.deleteAll();
  }

  @Test
  void postBookManageAndCancelBooking() throws Exception {
    var created = createMatch(2);
    var matchId = created.at("/match/id").asText();
    var organizerToken = created.get("manageToken").asText();

    mvc.perform(get(BASE))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].teamName").value("Ekens IF F11"))
        .andExpect(jsonPath("$[0].gender").value("P"))
        .andExpect(jsonPath("$[0].costSek").value(200))
        .andExpect(jsonPath("$[0].freeSlots").value(2));

    var booking = json(mvc.perform(post(BASE + "/" + matchId + "/bookings")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(bookingBody("Solna BK"))))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString());
    var bookingId = booking.at("/booking/id").asText();

    mvc.perform(post(BASE + "/" + matchId + "/bookings")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(bookingBody("solna bk"))))
        .andExpect(status().isConflict());

    mvc.perform(get(BASE + "/" + matchId))
        .andExpect(jsonPath("$.freeSlots").value(1))
        .andExpect(jsonPath("$.bookedTeams[0]").value("Solna BK"))
        .andExpect(jsonPath("$.contactEmail").value("ali@example.com"));

    mvc.perform(get(BASE + "/" + matchId + "/manage"))
        .andExpect(status().isForbidden());

    mvc.perform(get(BASE + "/" + matchId + "/manage").header("X-Manage-Token", organizerToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.bookings[0].contactEmail").value("jonas@example.com"));

    mvc.perform(delete(BASE + "/" + matchId + "/bookings/" + bookingId)
            .header("X-Manage-Token", booking.get("manageToken").asText()))
        .andExpect(status().isNoContent());

    mvc.perform(get(BASE + "/" + matchId))
        .andExpect(jsonPath("$.freeSlots").value(2));
  }

  @Test
  void bookingAFullMatchReturns422() throws Exception {
    var matchId = createMatch(1).at("/match/id").asText();
    mvc.perform(post(BASE + "/" + matchId + "/bookings")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(bookingBody("Solna BK"))))
        .andExpect(status().isCreated());

    mvc.perform(post(BASE + "/" + matchId + "/bookings")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(bookingBody("Hässelby SK"))))
        .andExpect(status().isUnprocessableEntity());
  }

  @Test
  void cancelledMatchDisappearsFromBoard() throws Exception {
    var created = createMatch(1);
    var matchId = created.at("/match/id").asText();

    mvc.perform(delete(BASE + "/" + matchId).header("X-Manage-Token", "wrong"))
        .andExpect(status().isForbidden());
    mvc.perform(delete(BASE + "/" + matchId).header("X-Manage-Token", created.get("manageToken").asText()))
        .andExpect(status().isNoContent());

    mvc.perform(get(BASE)).andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void missingRequiredFieldsReturn400() throws Exception {
    var body = matchBody(1);
    body.remove("venue");
    body.put("playersPerSide", 7);
    mvc.perform(post(BASE)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("venue"));
  }

  private JsonNode createMatch(int slots) throws Exception {
    var response = mvc.perform(post(BASE)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(matchBody(slots))))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString();
    return json(response);
  }

  private JsonNode json(String body) throws Exception {
    return objectMapper.readTree(body);
  }

  private static Map<String, Object> matchBody(int slots) {
    var body = new LinkedHashMap<String, Object>();
    body.put("teamName", "Ekens IF F11");
    body.put("gender", "P");
    body.put("birthYear", 2015);
    body.put("level", 2);
    body.put("playersPerSide", 5);
    body.put("kickoffAt", Instant.now().plus(Duration.ofDays(2)).toString());
    body.put("venue", "Ekens BP, plan 4");
    body.put("opponentSlots", slots);
    body.put("contactName", "Ali Hassan");
    body.put("contactPhone", "070-123 45 67");
    body.put("contactEmail", "ali@example.com");
    body.put("costSek", 200);
    body.put("notes", "2x25 min");
    return body;
  }

  private static Map<String, Object> bookingBody(String teamName) {
    return Map.of(
        "teamName", teamName,
        "contactName", "Jonas Lind",
        "contactPhone", "070-765 43 21",
        "contactEmail", "jonas@example.com");
  }
}
