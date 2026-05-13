package com.cup.backend.cups;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.cup.backend.cups.CupDtos.CupColors;
import com.cup.backend.cups.CupDtos.CupCreateRequest;
import com.cup.backend.teams.TeamRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class CupServiceTest {

  private static CupCreateRequest validRequest() {
    return new CupCreateRequest(
        "test-cup",
        "Test Cup",
        "IFK Test",
        new CupColors("220 90% 50%", "220 90% 95%"),
        LocalDate.of(2026, 6, 1),
        LocalDate.of(2026, 6, 1),
        "Main field",
        2,
        8,
        100,
        "Pay via QR",
        "https://example.com/lag",
        "https://example.com/qr.png",
        "Patrik",
        "patrik@example.com",
        "0700000000",
        7,
        "",
        false,
        null,
        null,
        null,
        null,
        null,
        null);
  }

  @Test
  void createRejectsStartDateAfterEndDate() {
    var repository = mock(CupRepository.class);
    var teamRepository = mock(TeamRepository.class);
    var service = new CupService(repository, teamRepository);
    var bad = new CupCreateRequest(
        "test-cup", "Test Cup", "IFK Test",
        new CupColors("220 90% 50%", "220 90% 95%"),
        LocalDate.of(2026, 6, 2),
        LocalDate.of(2026, 6, 1),
        "Main field",
        2, 8, 100,
        "", "", "",
        "Patrik", "patrik@example.com", "0700000000",
        7, "", false, null,
        null, null, null, null, null);

    assertThatThrownBy(() -> service.create(bad))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("startDate");
  }

  @Test
  void createRejectsDuplicateSlug() {
    var repository = mock(CupRepository.class);
    var teamRepository = mock(TeamRepository.class);
    when(repository.existsBySlug("test-cup")).thenReturn(true);
    var service = new CupService(repository, teamRepository);

    assertThatThrownBy(() -> service.create(validRequest()))
        .isInstanceOf(SlugConflictException.class)
        .extracting(ex -> ((SlugConflictException) ex).getSlug())
        .isEqualTo("test-cup");
  }

  @Test
  void createSavesAndReturnsTheNewCupAsDraft() {
    var repository = mock(CupRepository.class);
    var teamRepository = mock(TeamRepository.class);
    when(repository.existsBySlug(any())).thenReturn(false);
    when(repository.save(any(Cup.class))).thenAnswer(inv -> inv.getArgument(0));
    var service = new CupService(repository, teamRepository);

    var saved = service.create(validRequest());

    assertThat(saved.getSlug()).isEqualTo("test-cup");
    assertThat(saved.getStatus()).isEqualTo(CupStatus.DRAFT);
    assertThat(saved.getCreatedAt()).isNotNull();
    assertThat(saved.getPlayersPerTeam()).isEqualTo(7);
    assertThat(saved.isUseLevels()).isFalse();
    assertThat(saved.getLevels()).isEmpty();
  }

  @Test
  void createWithLevelsRequiresAtLeastTwoEntries() {
    var repository = mock(CupRepository.class);
    var teamRepository = mock(TeamRepository.class);
    when(repository.existsBySlug(any())).thenReturn(false);
    var service = new CupService(repository, teamRepository);
    var bad = new CupCreateRequest(
        "test-cup", "Test Cup", "IFK Test",
        new CupColors("220 90% 50%", "220 90% 95%"),
        LocalDate.of(2026, 6, 1),
        LocalDate.of(2026, 6, 1),
        "Main field",
        2, 8, 100,
        "", "", "",
        "Patrik", "patrik@example.com", "0700000000",
        7, "", true, List.of("Lätt"),
        null, null, null, null, null);

    assertThatThrownBy(() -> service.create(bad))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("levels");
  }

  @Test
  void createWithLevelsPersistsCsv() {
    var repository = mock(CupRepository.class);
    var teamRepository = mock(TeamRepository.class);
    when(repository.existsBySlug(any())).thenReturn(false);
    when(repository.save(any(Cup.class))).thenAnswer(inv -> inv.getArgument(0));
    var service = new CupService(repository, teamRepository);
    var req = new CupCreateRequest(
        "test-cup", "Test Cup", "IFK Test",
        new CupColors("220 90% 50%", "220 90% 95%"),
        LocalDate.of(2026, 6, 1),
        LocalDate.of(2026, 6, 1),
        "Main field",
        2, 8, 100,
        "", "", "",
        "Patrik", "patrik@example.com", "0700000000",
        9, "https://example.com/logo.png", true,
        List.of("Lätt", "Medel", "Svår"),
        null, null, null, null, null);

    var saved = service.create(req);

    assertThat(saved.getPlayersPerTeam()).isEqualTo(9);
    assertThat(saved.getClubLogoUrl()).isEqualTo("https://example.com/logo.png");
    assertThat(saved.isUseLevels()).isTrue();
    assertThat(saved.getLevels()).isEqualTo("Lätt,Medel,Svår");
  }

  @Test
  void createRejectsInvalidPlayersPerTeam() {
    var repository = mock(CupRepository.class);
    var teamRepository = mock(TeamRepository.class);
    when(repository.existsBySlug(any())).thenReturn(false);
    var service = new CupService(repository, teamRepository);
    var bad = new CupCreateRequest(
        "test-cup", "Test Cup", "IFK Test",
        new CupColors("220 90% 50%", "220 90% 95%"),
        LocalDate.of(2026, 6, 1),
        LocalDate.of(2026, 6, 1),
        "Main field",
        2, 8, 100,
        "", "", "",
        "Patrik", "patrik@example.com", "0700000000",
        11, "", false, null,
        null, null, null, null, null);

    assertThatThrownBy(() -> service.create(bad))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("playersPerTeam");
  }
}
