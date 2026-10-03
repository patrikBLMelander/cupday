package com.cup.backend.practicematches;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cup.backend.practicematches.PracticeMatchDtos.BookingRequest;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PracticeMatchServiceTest {

  private final PracticeMatchRepository matchRepository = mock(PracticeMatchRepository.class);
  private final PracticeMatchBookingRepository bookingRepository = mock(PracticeMatchBookingRepository.class);
  private final ManageTokenService tokenService = new ManageTokenService();
  private final PracticeMatchService service =
      new PracticeMatchService(matchRepository, bookingRepository, tokenService);

  private PracticeMatch match(String token, int slots) {
    var match = new PracticeMatch(UUID.randomUUID(), tokenService.hash(token), Instant.now());
    match.setTeamName("Ekens IF F11");
    match.setOpponentSlots(slots);
    match.setKickoffAt(Instant.now().plus(Duration.ofDays(3)));
    return match;
  }

  private static PracticeMatchBooking booking(UUID matchId, String teamName, String tokenHash) {
    return new PracticeMatchBooking(
        UUID.randomUUID(), matchId, teamName, "Anna", "0700", "a@example.com", null, tokenHash, Instant.now());
  }

  private static BookingRequest bookingRequest(String teamName) {
    return new BookingRequest(teamName, "Jonas", "0701", "j@example.com", null, null);
  }

  @Test
  void bookingRejectedWhenAllSlotsAreTaken() {
    var match = match("secret", 1);
    when(matchRepository.findByIdForUpdate(match.getId())).thenReturn(Optional.of(match));
    when(bookingRepository.findByMatchIdInAndStatusOrderByCreatedAtAsc(anyCollection(), eq(BookingStatus.BOOKED)))
        .thenReturn(List.of(booking(match.getId(), "Solna BK", "x")));

    assertThatThrownBy(() -> service.book(match.getId(), bookingRequest("Hässelby SK")))
        .isInstanceOf(PracticeMatchFullException.class);
    verify(bookingRepository, never()).save(any());
  }

  @Test
  void bookingReturnsOneTimeTokenThatMatchesStoredHash() {
    var match = match("secret", 2);
    when(matchRepository.findByIdForUpdate(match.getId())).thenReturn(Optional.of(match));
    when(bookingRepository.findByMatchIdInAndStatusOrderByCreatedAtAsc(anyCollection(), eq(BookingStatus.BOOKED)))
        .thenReturn(List.of());

    var response = service.book(match.getId(), bookingRequest("  Hässelby SK "));

    assertThat(response.booking().teamName()).isEqualTo("Hässelby SK");
    assertThat(response.manageToken()).isNotBlank();
  }

  @Test
  void cancelWithWrongTokenIsRejected() {
    var match = match("secret", 1);
    when(matchRepository.findByIdForUpdate(match.getId())).thenReturn(Optional.of(match));

    assertThatThrownBy(() -> service.cancel(match.getId(), "wrong"))
        .isInstanceOf(InvalidManageTokenException.class);
    assertThat(match.getStatus()).isEqualTo(PracticeMatchStatus.ACTIVE);
  }

  @Test
  void organizerTokenCanCancelSomeoneElsesBooking() {
    var match = match("organizer", 1);
    var booking = booking(match.getId(), "Solna BK", tokenService.hash("booker"));
    when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
    when(bookingRepository.findByIdAndMatchId(booking.getId(), match.getId())).thenReturn(Optional.of(booking));

    service.cancelBooking(match.getId(), booking.getId(), "organizer");

    assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(booking.getCancelledAt()).isNotNull();
  }
}
