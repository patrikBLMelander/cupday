package com.cup.backend.practicematches;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Practice-match request and response payloads. */
public final class PracticeMatchDtos {

  private static final int MAX_TEXT = 200;
  private static final int MAX_NOTES = 2000;

  private PracticeMatchDtos() {
    // Holder for record types.
  }

  /**
   * Create/update body. Everything is required except {@code costSek} and {@code notes}.
   * {@code website} is a honeypot: humans never see it, bots tend to fill it.
   */
  public record PracticeMatchRequest(
      @NotBlank @Size(max = MAX_TEXT) String teamName,
      @NotNull Gender gender,
      @NotNull @Min(1990) @Max(2030) Integer birthYear,
      @NotNull @Min(1) @Max(9) Integer level,
      @NotNull Integer playersPerSide,
      @NotNull @Future Instant kickoffAt,
      @NotBlank @Size(max = MAX_TEXT) String venue,
      @NotNull @Min(1) @Max(5) Integer opponentSlots,
      @NotBlank @Size(max = MAX_TEXT) String contactName,
      @NotBlank @Size(max = MAX_TEXT) String contactPhone,
      @NotBlank @Email @Size(max = MAX_TEXT) String contactEmail,
      @PositiveOrZero Integer costSek,
      @Size(max = MAX_NOTES) String notes,
      String website) {}

  /** Booking body. Everything is required except {@code message}; {@code website} is a honeypot. */
  public record BookingRequest(
      @NotBlank @Size(max = MAX_TEXT) String teamName,
      @NotBlank @Size(max = MAX_TEXT) String contactName,
      @NotBlank @Size(max = MAX_TEXT) String contactPhone,
      @NotBlank @Email @Size(max = MAX_TEXT) String contactEmail,
      @Size(max = MAX_NOTES) String message,
      String website) {}

  /** Public view of a match: organizer contact is public, booking contacts are not. */
  public record PublicPracticeMatch(
      UUID id,
      String teamName,
      Gender gender,
      int birthYear,
      int level,
      int playersPerSide,
      Instant kickoffAt,
      String venue,
      int opponentSlots,
      int freeSlots,
      List<String> bookedTeams,
      String contactName,
      String contactPhone,
      String contactEmail,
      Integer costSek,
      String notes,
      PracticeMatchStatus status,
      Instant createdAt) {

    /** Maps a match plus its active bookings. */
    public static PublicPracticeMatch from(PracticeMatch match, List<PracticeMatchBooking> activeBookings) {
      return new PublicPracticeMatch(
          match.getId(),
          match.getTeamName(),
          match.getGender(),
          match.getBirthYear(),
          match.getLevel(),
          match.getPlayersPerSide(),
          match.getKickoffAt(),
          match.getVenue(),
          match.getOpponentSlots(),
          Math.max(0, match.getOpponentSlots() - activeBookings.size()),
          activeBookings.stream().map(PracticeMatchBooking::getTeamName).toList(),
          match.getContactName(),
          match.getContactPhone(),
          match.getContactEmail(),
          match.getCostSek(),
          match.getNotes(),
          match.getStatus(),
          match.getCreatedAt());
    }
  }

  /** Full booking, visible to the organizer and to the booker. */
  public record BookingResponse(
      UUID id,
      UUID matchId,
      String teamName,
      String contactName,
      String contactPhone,
      String contactEmail,
      String message,
      BookingStatus status,
      Instant createdAt,
      Instant cancelledAt) {

    public static BookingResponse from(PracticeMatchBooking booking) {
      return new BookingResponse(
          booking.getId(),
          booking.getMatchId(),
          booking.getTeamName(),
          booking.getContactName(),
          booking.getContactPhone(),
          booking.getContactEmail(),
          booking.getMessage(),
          booking.getStatus(),
          booking.getCreatedAt(),
          booking.getCancelledAt());
    }
  }

  /** Returned once on create; the raw token is never stored or shown again. */
  public record CreatePracticeMatchResponse(PublicPracticeMatch match, String manageToken) {}

  /** Returned once on booking; the raw token is never stored or shown again. */
  public record CreateBookingResponse(BookingResponse booking, String manageToken) {}

  /** Organizer view: the match plus all bookings including contact details. */
  public record ManagedPracticeMatch(PublicPracticeMatch match, List<BookingResponse> bookings) {}
}
