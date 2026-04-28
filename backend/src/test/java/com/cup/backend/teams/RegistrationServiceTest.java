package com.cup.backend.teams;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.cup.backend.teams.TeamDtos.RegistrationCreateRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RegistrationServiceTest {

  private static Cup openCup(int maxTeams) {
    return new Cup(
        UUID.randomUUID(),
        "test-cup",
        "Test",
        "IFK",
        "220 90% 50%",
        "220 90% 95%",
        LocalDate.of(2026, 6, 1),
        LocalDate.of(2026, 6, 1),
        "Field",
        2,
        maxTeams,
        100,
        "",
        "",
        "",
        "Patrik",
        "p@example.com",
        "0700",
        CupStatus.OPEN,
        Instant.now());
  }

  private static RegistrationCreateRequest req(String... names) {
    return new RegistrationCreateRequest(
        "Club",
        "Patrik",
        "patrik@example.com",
        "0700",
        List.of(names));
  }

  @Test
  void registersOneTeamAndReservesIt() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var regRepo = mock(RegistrationRepository.class);
    var cup = openCup(8);
    when(cupRepo.findByIdForUpdate(cup.getId())).thenReturn(Optional.of(cup));
    when(teamRepo.findActiveByCupId(cup.getId())).thenReturn(List.of());
    when(teamRepo.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));

    var service = new RegistrationService(cupRepo, teamRepo, regRepo);
    var response = service.register(cup.getId(), req("IFK Lag 1"));

    assertThat(response.teamIds()).hasSize(1);
    assertThat(cup.getStatus()).isEqualTo(CupStatus.OPEN);
    verify(regRepo).save(any(Registration.class));
  }

  @Test
  void rejectsRegistrationWhenCupNotOpen() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var regRepo = mock(RegistrationRepository.class);
    var cup = openCup(8);
    cup.setStatus(CupStatus.DRAFT);
    when(cupRepo.findByIdForUpdate(cup.getId())).thenReturn(Optional.of(cup));

    var service = new RegistrationService(cupRepo, teamRepo, regRepo);

    assertThatThrownBy(() -> service.register(cup.getId(), req("Lag")))
        .isInstanceOf(CupNotOpenException.class);
  }

  @Test
  void flipsCupStatusToFullWhenCapacityHits() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var regRepo = mock(RegistrationRepository.class);
    var cup = openCup(2);
    when(cupRepo.findByIdForUpdate(cup.getId())).thenReturn(Optional.of(cup));
    when(teamRepo.findActiveByCupId(cup.getId())).thenReturn(List.of());
    when(teamRepo.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));

    var service = new RegistrationService(cupRepo, teamRepo, regRepo);
    service.register(cup.getId(), req("A", "B"));

    assertThat(cup.getStatus()).isEqualTo(CupStatus.FULL);
  }
}
