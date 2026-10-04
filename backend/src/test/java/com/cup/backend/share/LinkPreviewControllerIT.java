package com.cup.backend.share;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.cup.backend.practicematches.PracticeMatchBookingRepository;
import com.cup.backend.practicematches.PracticeMatchRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class LinkPreviewControllerIT extends AbstractIntegrationTest {

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
  void matchPreviewHasOpenGraphTagsAndEscapesUserText() throws Exception {
    var kickoff = Instant.now().plus(Duration.ofDays(3));
    var body = new LinkedHashMap<String, Object>();
    body.put("teamName", "Ekens IF <F11>");
    body.put("gender", "F");
    body.put("birthYear", 2015);
    body.put("levelMin", 2);
    body.put("levelMax", 3);
    body.put("playersPerSide", 5);
    body.put("kickoffAt", kickoff.toString());
    body.put("endsAt", kickoff.plus(Duration.ofMinutes(90)).toString());
    body.put("venue", "Ekens BP");
    body.put("opponentSlots", 2);
    body.put("contactName", "Ali");
    body.put("contactPhone", "070");
    body.put("contactEmail", "ali@example.com");
    body.put("acceptTerms", true);
    var created = objectMapper.readTree(mvc.perform(post("/api/practice-matches")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andReturn().getResponse().getContentAsString());
    var id = created.at("/match/id").asText();

    mvc.perform(get("/api/og/match/" + id))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
        .andExpect(content().string(containsString("og:title\" content=\"Ekens IF &lt;F11&gt; söker motstånd – F15 5v5\"")))
        .andExpect(content().string(containsString("Nivå Lätt–Lätt+ · 2 av 2 platser lediga")))
        .andExpect(content().string(containsString("/matcher/" + id)))
        .andExpect(content().string(containsString("og-image.png")))
        .andExpect(content().string(not(containsString("<F11>"))));
  }

  @Test
  void unknownMatchFallsBackToSiteDefaults() throws Exception {
    mvc.perform(get("/api/og/match/" + UUID.randomUUID()))
        .andExpect(status().isOk())
        .andExpect(content().string(containsString("Din Cup – matcher &amp; cuper")));
  }
}
