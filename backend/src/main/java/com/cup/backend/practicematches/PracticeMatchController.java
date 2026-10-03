package com.cup.backend.practicematches;

import com.cup.backend.practicematches.PracticeMatchDtos.BookingRequest;
import com.cup.backend.practicematches.PracticeMatchDtos.CreateBookingResponse;
import com.cup.backend.practicematches.PracticeMatchDtos.CreatePracticeMatchResponse;
import com.cup.backend.practicematches.PracticeMatchDtos.ManagedPracticeMatch;
import com.cup.backend.practicematches.PracticeMatchDtos.PracticeMatchRequest;
import com.cup.backend.practicematches.PracticeMatchDtos.PublicPracticeMatch;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public practice-match board. No accounts: writes are authorized by the {@code X-Manage-Token} header. */
@RestController
@RequestMapping("/api/practice-matches")
public class PracticeMatchController {

  static final String TOKEN_HEADER = "X-Manage-Token";

  private final PracticeMatchService service;
  private final PostRateLimiter rateLimiter;

  public PracticeMatchController(PracticeMatchService service, PostRateLimiter rateLimiter) {
    this.service = service;
    this.rateLimiter = rateLimiter;
  }

  @GetMapping
  public List<PublicPracticeMatch> list(
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to) {
    return service.listUpcoming(from, to);
  }

  @GetMapping("/{id}")
  public PublicPracticeMatch get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  public ResponseEntity<CreatePracticeMatchResponse> create(
      @Valid @RequestBody PracticeMatchRequest request,
      HttpServletRequest httpRequest) {
    rateLimiter.check(httpRequest);
    return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
  }

  @PutMapping("/{id}")
  public PublicPracticeMatch update(
      @PathVariable UUID id,
      @RequestHeader(name = TOKEN_HEADER, required = false) String token,
      @Valid @RequestBody PracticeMatchRequest request) {
    return service.update(id, token, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> cancel(
      @PathVariable UUID id,
      @RequestHeader(name = TOKEN_HEADER, required = false) String token) {
    service.cancel(id, token);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/manage")
  public ManagedPracticeMatch manage(
      @PathVariable UUID id,
      @RequestHeader(name = TOKEN_HEADER, required = false) String token) {
    return service.manage(id, token);
  }

  @PostMapping("/{id}/bookings")
  public ResponseEntity<CreateBookingResponse> book(
      @PathVariable UUID id,
      @Valid @RequestBody BookingRequest request,
      HttpServletRequest httpRequest) {
    rateLimiter.check(httpRequest);
    return ResponseEntity.status(HttpStatus.CREATED).body(service.book(id, request));
  }

  @DeleteMapping("/{id}/bookings/{bookingId}")
  public ResponseEntity<Void> cancelBooking(
      @PathVariable UUID id,
      @PathVariable UUID bookingId,
      @RequestHeader(name = TOKEN_HEADER, required = false) String token) {
    service.cancelBooking(id, bookingId, token);
    return ResponseEntity.noContent().build();
  }
}
