package com.cup.backend.teams;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AdminTeamServiceTest {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private static JsonNode body(String json) {
    try {
      return MAPPER.readTree(json);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static Cup cup(CupStatus status, int maxTeams) {
    return new Cup(
        UUID.randomUUID(),
        "test", "Test", "IFK",
        "0 0% 50%", "0 0% 95%",
        LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 1),
        "Field", 2, maxTeams, 0,
        "", "", "",
        "P", "p@example.com", "0",
        status, Instant.now());
  }

  private static Team reservedTeam(UUID cupId) {
    return new Team(
        UUID.randomUUID(), cupId, UUID.randomUUID(),
        "Lag", "IFK",
        "P", "p@example.com", "0",
        null, TeamStatus.RESERVED, Instant.now());
  }

  @Test
  void markPaidStampsPaidAt() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var cup = cup(CupStatus.OPEN, 8);
    var team = reservedTeam(cup.getId());
    when(teamRepo.findById(team.getId())).thenReturn(Optional.of(team));

    var service = new AdminTeamService(cupRepo, teamRepo);
    service.updateTeam(team.getId(), body("{\"status\":\"paid\"}"));

    assertThat(team.getStatus()).isEqualTo(TeamStatus.PAID);
    assertThat(team.getPaidAt()).isNotNull();
    assertThat(team.getCancelledAt()).isNull();
  }

  @Test
  void cancelStampsCancelledAtAndReboundsFullCupToOpen() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var cup = cup(CupStatus.FULL, 2);
    var team = reservedTeam(cup.getId());
    when(teamRepo.findById(team.getId())).thenReturn(Optional.of(team));
    when(cupRepo.findByIdForUpdate(cup.getId())).thenReturn(Optional.of(cup));
    when(teamRepo.countActiveByCupId(cup.getId())).thenReturn(1L);

    var service = new AdminTeamService(cupRepo, teamRepo);
    service.updateTeam(team.getId(), body("{\"status\":\"cancelled\"}"));

    assertThat(team.getStatus()).isEqualTo(TeamStatus.CANCELLED);
    assertThat(team.getCancelledAt()).isNotNull();
    assertThat(cup.getStatus()).isEqualTo(CupStatus.OPEN);
  }

  @Test
  void groupAssignmentSetsLabelExplicitNullClearsAndAbsentLeavesUnchanged() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var team = reservedTeam(UUID.randomUUID());
    when(teamRepo.findById(team.getId())).thenReturn(Optional.of(team));

    var service = new AdminTeamService(cupRepo, teamRepo);

    service.updateTeam(team.getId(), body("{\"groupLabel\":\"A\"}"));
    assertThat(team.getGroupLabel()).isEqualTo(GroupLabel.A);

    service.updateTeam(team.getId(), body("{\"groupLabel\":null}"));
    assertThat(team.getGroupLabel()).isNull();

    service.updateTeam(team.getId(), body("{\"groupLabel\":\"B\"}"));
    // Absent groupLabel: status-only update should not clear the group.
    service.updateTeam(team.getId(), body("{\"status\":\"paid\"}"));
    assertThat(team.getGroupLabel()).isEqualTo(GroupLabel.B);
  }

  @Test
  void cancelledTeamCannotBeModified() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var team = reservedTeam(UUID.randomUUID());
    team.setStatus(TeamStatus.CANCELLED);
    when(teamRepo.findById(team.getId())).thenReturn(Optional.of(team));

    var service = new AdminTeamService(cupRepo, teamRepo);

    assertThatThrownBy(() -> service.updateTeam(
        team.getId(),
        body("{\"status\":\"paid\"}")))
        .isInstanceOf(InvalidTeamTransitionException.class);
  }
}
