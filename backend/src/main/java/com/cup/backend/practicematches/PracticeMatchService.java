package com.cup.backend.practicematches;

import com.cup.backend.practicematches.PracticeMatchDtos.BookingRequest;
import com.cup.backend.practicematches.PracticeMatchDtos.BookingResponse;
import com.cup.backend.practicematches.PracticeMatchDtos.CreateBookingResponse;
import com.cup.backend.practicematches.PracticeMatchDtos.CreatePracticeMatchResponse;
import com.cup.backend.practicematches.PracticeMatchDtos.ManagedPracticeMatch;
import com.cup.backend.practicematches.PracticeMatchDtos.PracticeMatchRequest;
import com.cup.backend.practicematches.PracticeMatchDtos.PublicPracticeMatch;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Public practice-match board: posting, booking and token-based management without accounts. */
@Service
public class PracticeMatchService {

  private static final Set<Integer> ALLOWED_PLAYERS_PER_SIDE = Set.of(5, 7, 9, 11);
  private static final Duration DEFAULT_WINDOW = Duration.ofDays(60);
  private static final Duration MAX_WINDOW = Duration.ofDays(180);

  private final PracticeMatchRepository matchRepository;
  private final PracticeMatchBookingRepository bookingRepository;
  private final ManageTokenService tokenService;

  public PracticeMatchService(
      PracticeMatchRepository matchRepository,
      PracticeMatchBookingRepository bookingRepository,
      ManageTokenService tokenService) {
    this.matchRepository = matchRepository;
    this.bookingRepository = bookingRepository;
    this.tokenService = tokenService;
  }

  /** Active matches between {@code from} (default now) and {@code to} (default from + 60 days), soonest first. */
  @Transactional(readOnly = true)
  public List<PublicPracticeMatch> listUpcoming(Instant from, Instant to) {
    var start = from == null ? Instant.now() : from;
    var end = to == null ? start.plus(DEFAULT_WINDOW) : to;
    if (end.isBefore(start)) {
      throw new IllegalArgumentException("'to' must not be before 'from'");
    }
    if (Duration.between(start, end).compareTo(MAX_WINDOW) > 0) {
      throw new IllegalArgumentException("Time window may be at most " + MAX_WINDOW.toDays() + " days");
    }
    var matches = matchRepository.findByStatusAndKickoffAtBetweenOrderByKickoffAtAsc(
        PracticeMatchStatus.ACTIVE, start, end);
    var matchIds = matches.stream().map(PracticeMatch::getId).toList();
    var bookingsByMatch = bookingRepository
        .findByMatchIdInAndStatusOrderByCreatedAtAsc(matchIds, BookingStatus.BOOKED).stream()
        .collect(Collectors.groupingBy(PracticeMatchBooking::getMatchId));
    return matches.stream()
        .map(match -> PublicPracticeMatch.from(match, bookingsByMatch.getOrDefault(match.getId(), List.of())))
        .toList();
  }

  @Transactional(readOnly = true)
  public PublicPracticeMatch get(UUID id) {
    var match = findMatch(id);
    return PublicPracticeMatch.from(match, activeBookings(id));
  }

  /** Posts a new match and returns its one-time manage token. */
  @Transactional
  public CreatePracticeMatchResponse create(PracticeMatchRequest request) {
    rejectHoneypot(request.website());
    var token = tokenService.generate();
    var match = new PracticeMatch(UUID.randomUUID(), tokenService.hash(token), Instant.now());
    apply(match, request);
    matchRepository.save(match);
    return new CreatePracticeMatchResponse(PublicPracticeMatch.from(match, List.of()), token);
  }

  /** Replaces the editable fields of an active match. */
  @Transactional
  public PublicPracticeMatch update(UUID id, String token, PracticeMatchRequest request) {
    var match = lockMatch(id);
    requireMatchToken(match, token);
    if (match.getStatus() != PracticeMatchStatus.ACTIVE) {
      throw new PracticeMatchNotBookableException("A cancelled match cannot be edited");
    }
    var bookings = activeBookings(id);
    if (request.opponentSlots() < bookings.size()) {
      throw new IllegalArgumentException(
          "opponentSlots cannot be lower than the number of bookings (" + bookings.size() + ")");
    }
    apply(match, request);
    return PublicPracticeMatch.from(match, bookings);
  }

  /** Cancels the match. Idempotent. */
  @Transactional
  public void cancel(UUID id, String token) {
    var match = lockMatch(id);
    requireMatchToken(match, token);
    if (match.getStatus() == PracticeMatchStatus.ACTIVE) {
      match.setStatus(PracticeMatchStatus.CANCELLED);
      match.setCancelledAt(Instant.now());
    }
  }

  /** Organizer view including every booking's contact details. */
  @Transactional(readOnly = true)
  public ManagedPracticeMatch manage(UUID id, String token) {
    var match = findMatch(id);
    requireMatchToken(match, token);
    var bookings = bookingRepository.findByMatchIdOrderByCreatedAtAsc(id);
    var active = bookings.stream().filter(b -> b.getStatus() == BookingStatus.BOOKED).toList();
    return new ManagedPracticeMatch(
        PublicPracticeMatch.from(match, active),
        bookings.stream().map(BookingResponse::from).toList());
  }

  /** Takes a free slot, first come first served. Serialized per match by a row lock. */
  @Transactional
  public CreateBookingResponse book(UUID matchId, BookingRequest request) {
    rejectHoneypot(request.website());
    var match = lockMatch(matchId);
    if (match.getStatus() != PracticeMatchStatus.ACTIVE || !match.getKickoffAt().isAfter(Instant.now())) {
      throw new PracticeMatchNotBookableException("This match can no longer be booked");
    }
    var bookings = activeBookings(matchId);
    if (bookings.size() >= match.getOpponentSlots()) {
      throw new PracticeMatchFullException("All slots in this match are taken");
    }
    var teamName = request.teamName().trim();
    if (bookings.stream().anyMatch(b -> b.getTeamName().equalsIgnoreCase(teamName))) {
      throw new BookingTeamConflictException(teamName);
    }
    var token = tokenService.generate();
    var booking = new PracticeMatchBooking(
        UUID.randomUUID(),
        matchId,
        teamName,
        request.contactName().trim(),
        request.contactPhone().trim(),
        request.contactEmail().trim(),
        trimToNull(request.message()),
        tokenService.hash(token),
        Instant.now());
    bookingRepository.save(booking);
    return new CreateBookingResponse(BookingResponse.from(booking), token);
  }

  /** Cancels a booking with either the booker's or the organizer's token. Idempotent. */
  @Transactional
  public void cancelBooking(UUID matchId, UUID bookingId, String token) {
    var match = findMatch(matchId);
    var booking = bookingRepository.findByIdAndMatchId(bookingId, matchId)
        .orElseThrow(() -> new BookingNotFoundException("Booking " + bookingId + " not found"));
    var authorized = tokenService.matches(token, booking.getManageTokenHash())
        || tokenService.matches(token, match.getManageTokenHash());
    if (!authorized) {
      throw new InvalidManageTokenException("Invalid manage token");
    }
    if (booking.getStatus() == BookingStatus.BOOKED) {
      booking.setStatus(BookingStatus.CANCELLED);
      booking.setCancelledAt(Instant.now());
    }
  }

  /** Hard delete for moderation (spam). Bookings cascade. */
  @Transactional
  public void adminDelete(UUID id) {
    if (!matchRepository.existsById(id)) {
      throw new PracticeMatchNotFoundException("Practice match " + id + " not found");
    }
    matchRepository.deleteById(id);
  }

  private void apply(PracticeMatch match, PracticeMatchRequest request) {
    if (!ALLOWED_PLAYERS_PER_SIDE.contains(request.playersPerSide())) {
      throw new IllegalArgumentException("playersPerSide must be one of " + ALLOWED_PLAYERS_PER_SIDE);
    }
    match.setTeamName(request.teamName().trim());
    match.setGender(request.gender());
    match.setBirthYear(request.birthYear());
    match.setLevel(request.level());
    match.setPlayersPerSide(request.playersPerSide());
    match.setKickoffAt(request.kickoffAt());
    match.setVenue(request.venue().trim());
    match.setOpponentSlots(request.opponentSlots());
    match.setContactName(request.contactName().trim());
    match.setContactPhone(request.contactPhone().trim());
    match.setContactEmail(request.contactEmail().trim());
    match.setCostSek(request.costSek());
    match.setNotes(trimToNull(request.notes()));
  }

  private PracticeMatch findMatch(UUID id) {
    return matchRepository.findById(id)
        .orElseThrow(() -> new PracticeMatchNotFoundException("Practice match " + id + " not found"));
  }

  private PracticeMatch lockMatch(UUID id) {
    return matchRepository.findByIdForUpdate(id)
        .orElseThrow(() -> new PracticeMatchNotFoundException("Practice match " + id + " not found"));
  }

  private List<PracticeMatchBooking> activeBookings(UUID matchId) {
    return bookingRepository.findByMatchIdInAndStatusOrderByCreatedAtAsc(List.of(matchId), BookingStatus.BOOKED);
  }

  private void requireMatchToken(PracticeMatch match, String token) {
    if (!tokenService.matches(token, match.getManageTokenHash())) {
      throw new InvalidManageTokenException("Invalid manage token");
    }
  }

  private static void rejectHoneypot(String website) {
    if (website != null && !website.isBlank()) {
      throw new IllegalArgumentException("Request rejected");
    }
  }

  private static String trimToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }
}
