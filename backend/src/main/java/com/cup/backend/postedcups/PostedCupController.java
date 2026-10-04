package com.cup.backend.postedcups;

import com.cup.backend.cups.CupDtos.CupResponse;
import com.cup.backend.practicematches.PostRateLimiter;
import com.cup.backend.postedcups.PostedCupDtos.CreatePostedCupResponse;
import com.cup.backend.postedcups.PostedCupDtos.ManagedCupResponse;
import com.cup.backend.postedcups.PostedCupDtos.PostedCupRequest;
import com.cup.backend.postedcups.PostedCupDtos.TeamStatusRequest;
import com.cup.backend.teams.TeamDtos.AdminTeamResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Post a cup without an account; manage it with the {@code X-Manage-Token} header. */
@RestController
@RequestMapping("/api/cups")
public class PostedCupController {

  private static final String TOKEN_HEADER = "X-Manage-Token";

  private final PostedCupService service;
  private final PostRateLimiter rateLimiter;

  public PostedCupController(PostedCupService service, PostRateLimiter rateLimiter) {
    this.service = service;
    this.rateLimiter = rateLimiter;
  }

  @PostMapping
  public ResponseEntity<CreatePostedCupResponse> create(
      @Valid @RequestBody PostedCupRequest request,
      HttpServletRequest httpRequest) {
    rateLimiter.check(httpRequest);
    return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
  }

  @GetMapping("/{id}/manage")
  public ManagedCupResponse manage(
      @PathVariable UUID id,
      @RequestHeader(name = TOKEN_HEADER, required = false) String token) {
    return service.manage(id, token);
  }

  @PutMapping("/{id}/manage")
  public CupResponse update(
      @PathVariable UUID id,
      @RequestHeader(name = TOKEN_HEADER, required = false) String token,
      @Valid @RequestBody PostedCupRequest request) {
    return service.update(id, token, request);
  }

  @DeleteMapping("/{id}/manage")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id,
      @RequestHeader(name = TOKEN_HEADER, required = false) String token) {
    service.delete(id, token);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{id}/manage/teams/{teamId}")
  public AdminTeamResponse setTeamStatus(
      @PathVariable UUID id,
      @PathVariable UUID teamId,
      @RequestHeader(name = TOKEN_HEADER, required = false) String token,
      @Valid @RequestBody TeamStatusRequest request) {
    return service.setTeamStatus(id, token, teamId, request.status());
  }
}
