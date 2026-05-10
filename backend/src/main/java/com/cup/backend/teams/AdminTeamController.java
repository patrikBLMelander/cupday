package com.cup.backend.teams;

import com.cup.backend.teams.TeamDtos.AdminTeamResponse;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Admin team list + per-team status / group updates. Auth enforced by /api/admin/** rule. */
@RestController
public class AdminTeamController {

  private final AdminTeamService service;

  public AdminTeamController(AdminTeamService service) {
    this.service = service;
  }

  @GetMapping("/api/admin/cups/{cupId}/teams")
  public List<AdminTeamResponse> list(@PathVariable UUID cupId) {
    return service.listAll(cupId).stream().map(AdminTeamResponse::from).toList();
  }

  /**
   * Body shape: {@code { "status"?: TeamStatus, "groupLabel"?: GroupLabel | null }}.
   * Consumed as a raw JsonNode so we can distinguish absent vs explicit null on
   * {@code groupLabel} (Jackson collapses the two when binding to records).
   */
  @PatchMapping("/api/admin/teams/{id}")
  public AdminTeamResponse update(
      @PathVariable UUID id,
      @RequestBody JsonNode body) {
    return AdminTeamResponse.from(service.updateTeam(id, body));
  }
}
