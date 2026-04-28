package com.cup.backend.cups;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cup.backend.AbstractIntegrationTest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class PublicCupControllerIT extends AbstractIntegrationTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  CupRepository cupRepository;

  @BeforeEach
  void cleanCups() {
    cupRepository.deleteAll();
  }

  @Test
  void byslugReturns200ForExistingAnd404Otherwise() throws Exception {
    cupRepository.save(new Cup(
        UUID.randomUUID(),
        "test-cup",
        "Test Cup",
        "IFK Test",
        "220 90% 50%",
        "220 90% 95%",
        LocalDate.of(2026, 6, 1),
        LocalDate.of(2026, 6, 1),
        "Main field",
        2,
        8,
        100,
        "",
        "",
        "",
        "Patrik",
        "patrik@example.com",
        "0700000000",
        CupStatus.DRAFT,
        Instant.now()));

    mvc.perform(get("/api/cups/by-slug/test-cup"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.slug").value("test-cup"))
        .andExpect(jsonPath("$.status").value("draft"));

    mvc.perform(get("/api/cups/by-slug/no-such-cup"))
        .andExpect(status().isNotFound());
  }
}
