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
        List.of(names),
        null,
        null);
  }

  private static RegistrationCreateRequest reqWithLevels(List<String> names, List<String> levels) {
    return new RegistrationCreateRequest(
        "Club",
        "Patrik",
        "patrik@example.com",
        "0700",
        names,
        levels,
        null);
  }

  private static Cup leveledCup(int maxTeams, String levelsCsv) {
    var cup = openCup(maxTeams);
    cup.setUseLevels(true);
    cup.setLevels(levelsCsv);
    return cup;
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

  @Test
  void rejectsTeamLevelOutsideCupConfiguration() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var regRepo = mock(RegistrationRepository.class);
    var cup = leveledCup(8, "Lätt,Medel,Svår");
    when(cupRepo.findByIdForUpdate(cup.getId())).thenReturn(Optional.of(cup));
    when(teamRepo.findActiveByCupId(cup.getId())).thenReturn(List.of());

    var service = new RegistrationService(cupRepo, teamRepo, regRepo);

    assertThatThrownBy(() ->
        service.register(cup.getId(), reqWithLevels(List.of("IFK Lag 1"), List.of("Pro"))))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Pro");
  }

  @Test
  void persistsLevelOnTeamWhenCupUsesLevels() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var regRepo = mock(RegistrationRepository.class);
    var cup = leveledCup(8, "Lätt,Medel,Svår");
    when(cupRepo.findByIdForUpdate(cup.getId())).thenReturn(Optional.of(cup));
    when(teamRepo.findActiveByCupId(cup.getId())).thenReturn(List.of());
    var saved = new java.util.ArrayList<Team>();
    when(teamRepo.save(any(Team.class))).thenAnswer(inv -> {
      Team t = inv.getArgument(0);
      saved.add(t);
      return t;
    });

    var service = new RegistrationService(cupRepo, teamRepo, regRepo);
    service.register(cup.getId(),
        reqWithLevels(List.of("IFK Lag 1", "IFK Lag 2"), List.of("medel", "Svår")));

    assertThat(saved).hasSize(2);
    assertThat(saved.get(0).getLevel()).isEqualTo("Medel");
    assertThat(saved.get(1).getLevel()).isEqualTo("Svår");
  }

  @Test
  void persistsTeamLogoUrlsWhenProvided() {
    var cupRepo = mock(CupRepository.class);
    var teamRepo = mock(TeamRepository.class);
    var regRepo = mock(RegistrationRepository.class);
    var cup = openCup(8);
    when(cupRepo.findByIdForUpdate(cup.getId())).thenReturn(Optional.of(cup));
    when(teamRepo.findActiveByCupId(cup.getId())).thenReturn(List.of());
    var saved = new java.util.ArrayList<Team>();
    when(teamRepo.save(any(Team.class))).thenAnswer(inv -> {
      Team t = inv.getArgument(0);
      saved.add(t);
      return t;
    });

    var request = new RegistrationCreateRequest(
        "Club",
        "Patrik",
        "patrik@example.com",
        "0700",
        List.of("IFK Lag 1", "IFK Lag 2"),
        null,
        List.of("https://example.com/a.png", "https://example.com/b.png"));

    var service = new RegistrationService(cupRepo, teamRepo, regRepo);
    service.register(cup.getId(), request);

    assertThat(saved).hasSize(2);
    assertThat(saved.get(0).getLogoUrl()).isEqualTo("https://example.com/a.png");
    assertThat(saved.get(1).getLogoUrl()).isEqualTo("https://example.com/b.png");
  }
}
