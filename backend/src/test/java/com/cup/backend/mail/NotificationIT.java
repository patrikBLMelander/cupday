package com.cup.backend.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import com.cup.backend.practicematches.PracticeMatchBookingRepository;
import com.cup.backend.practicematches.PracticeMatchRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class NotificationIT extends AbstractIntegrationTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper objectMapper;

  @Autowired
  PracticeMatchRepository matchRepository;

  @Autowired
  PracticeMatchBookingRepository bookingRepository;

  @MockBean
  MailSender mailSender;

  @BeforeEach
  void cleanup() {
    bookingRepository.deleteAll();
    matchRepository.deleteAll();
  }

  @Test
  void postingAndBookingAMatchEmailsBothSidesWithTheirLinks() throws Exception {
    when(mailSender.enabled()).thenReturn(true);
    var kickoff = Instant.now().plus(Duration.ofDays(3));
    var match = new LinkedHashMap<String, Object>();
    match.put("teamName", "Älvsjö AIK P2017 Grupp 3");
    match.put("gender", "P");
    match.put("birthYear", 2017);
    match.put("levelMin", 2);
    match.put("levelMax", 2);
    match.put("playersPerSide", 7);
    match.put("kickoffAt", kickoff.toString());
    match.put("endsAt", kickoff.plus(Duration.ofMinutes(60)).toString());
    match.put("venue", "Älvsjö IP plan 3");
    match.put("opponentSlots", 1);
    match.put("contactName", "Andreas W");
    match.put("contactPhone", "070-111 22 33");
    match.put("contactEmail", "andreas@example.com");
    match.put("acceptTerms", true);
    var created = objectMapper.readTree(mvc.perform(post("/api/practice-matches")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(match)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.confirmationEmail").value(true))
        .andReturn().getResponse().getContentAsString());
    var matchId = created.at("/match/id").asText();
    var manageToken = created.get("manageToken").asText();

    var booking = objectMapper.readTree(mvc.perform(post("/api/practice-matches/" + matchId + "/bookings")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "teamName", "Solna BK P17",
                "contactName", "Jonas Lind",
                "contactPhone", "070-765 43 21",
                "contactEmail", "jonas@example.com",
                "message", "Vi tar med domare",
                "acceptTerms", true))))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString());
    var bookingId = booking.at("/booking/id").asText();

    var captor = ArgumentCaptor.forClass(MailMessage.class);
    verify(mailSender, timeout(5000).times(3)).send(captor.capture());
    var mails = captor.getAllValues();

    var posted = mails.stream().filter(m -> m.subject().startsWith("Din träningsmatch är upplagd")).findFirst().orElseThrow();
    assertThat(posted.to()).isEqualTo("andreas@example.com");
    assertThat(posted.text()).contains("/matcher/" + matchId + "/hantera#" + manageToken);

    var toOrganizer = mails.stream().filter(m -> m.subject().startsWith("Solna BK P17 har bokat")).findFirst().orElseThrow();
    assertThat(toOrganizer.to()).isEqualTo("andreas@example.com");
    assertThat(toOrganizer.replyTo()).isEqualTo("jonas@example.com");
    assertThat(toOrganizer.text()).contains("Jonas Lind", "070-765 43 21", "Vi tar med domare");
    assertThat(toOrganizer.html()).doesNotContain("<script");

    var toBooker = mails.stream().filter(m -> m.subject().startsWith("Bokningsbekräftelse")).findFirst().orElseThrow();
    assertThat(toBooker.to()).isEqualTo("jonas@example.com");
    assertThat(toBooker.replyTo()).isEqualTo("andreas@example.com");
    assertThat(toBooker.text()).contains("/matcher/" + matchId + "#avboka." + bookingId + ".");
  }

  @Test
  void aFailingMailServiceNeverBreaksTheRequest() throws Exception {
    when(mailSender.enabled()).thenReturn(true);
    doThrow(new RuntimeException("mail down")).when(mailSender).send(any());
    var kickoff = Instant.now().plus(Duration.ofDays(3));
    var match = new LinkedHashMap<String, Object>();
    match.put("teamName", "Ekens IF");
    match.put("gender", "F");
    match.put("birthYear", 2015);
    match.put("levelMin", 1);
    match.put("levelMax", 1);
    match.put("playersPerSide", 5);
    match.put("kickoffAt", kickoff.toString());
    match.put("endsAt", kickoff.plus(Duration.ofMinutes(60)).toString());
    match.put("venue", "Ekens BP");
    match.put("opponentSlots", 1);
    match.put("contactName", "Ali");
    match.put("contactPhone", "070");
    match.put("contactEmail", "ali@example.com");
    match.put("acceptTerms", true);

    mvc.perform(post("/api/practice-matches")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(match)))
        .andExpect(status().isCreated());
    verify(mailSender, timeout(5000)).send(any());
  }
}
