package com.cup.backend.cups;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.cup.backend.cups.CupDtos.CupColors;
import com.cup.backend.cups.CupDtos.CupCreateRequest;
import java.time.LocalDate;
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
        "0700000000");
  }

  @Test
  void createRejectsStartDateAfterEndDate() {
    var repository = mock(CupRepository.class);
    var service = new CupService(repository);
    var bad = new CupCreateRequest(
        "test-cup", "Test Cup", "IFK Test",
        new CupColors("220 90% 50%", "220 90% 95%"),
        LocalDate.of(2026, 6, 2),
        LocalDate.of(2026, 6, 1),
        "Main field",
        2, 8, 100,
        "", "", "",
        "Patrik", "patrik@example.com", "0700000000");

    assertThatThrownBy(() -> service.create(bad))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("startDate");
  }

  @Test
  void createRejectsDuplicateSlug() {
    var repository = mock(CupRepository.class);
    when(repository.existsBySlug("test-cup")).thenReturn(true);
    var service = new CupService(repository);

    assertThatThrownBy(() -> service.create(validRequest()))
        .isInstanceOf(SlugConflictException.class)
        .extracting(ex -> ((SlugConflictException) ex).getSlug())
        .isEqualTo("test-cup");
  }

  @Test
  void createSavesAndReturnsTheNewCupAsDraft() {
    var repository = mock(CupRepository.class);
    when(repository.existsBySlug(any())).thenReturn(false);
    when(repository.save(any(Cup.class))).thenAnswer(inv -> inv.getArgument(0));
    var service = new CupService(repository);

    var saved = service.create(validRequest());

    assertThat(saved.getSlug()).isEqualTo("test-cup");
    assertThat(saved.getStatus()).isEqualTo(CupStatus.DRAFT);
    assertThat(saved.getCreatedAt()).isNotNull();
  }
}
