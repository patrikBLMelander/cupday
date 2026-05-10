package com.cup.backend.schedule;

import com.cup.backend.schedule.ScheduleDtos.GenerateScheduleRequest;
import com.cup.backend.schedule.ScheduleDtos.MatchResponse;
import com.cup.backend.schedule.ScheduleDtos.MatchUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Admin schedule generation + per-match updates. Auth enforced by /api/admin/** rule. */
@RestController
public class AdminScheduleController {

  private final ScheduleService service;

  public AdminScheduleController(ScheduleService service) {
    this.service = service;
  }

  @PostMapping("/api/admin/cups/{cupId}/schedule/generate")
  public List<MatchResponse> generate(
      @PathVariable UUID cupId,
      @Valid @RequestBody GenerateScheduleRequest request) {
    return service.generate(cupId, request).stream()
        .map(MatchResponse::from)
        .toList();
  }

  @PatchMapping("/api/admin/matches/{id}")
  public MatchResponse update(
      @PathVariable UUID id,
      @RequestBody MatchUpdateRequest request) {
    return MatchResponse.from(service.updateMatch(id, request));
  }
}
