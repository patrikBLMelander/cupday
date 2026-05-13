package com.cup.backend.teams;

import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupNotFoundException;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin team operations: list, status transitions, group assignment, cup rebound. */
@Service
public class AdminTeamService {

  private final CupRepository cupRepository;
  private final TeamRepository teamRepository;

  public AdminTeamService(CupRepository cupRepository, TeamRepository teamRepository) {
    this.cupRepository = cupRepository;
    this.teamRepository = teamRepository;
  }

  @Transactional(readOnly = true)
  public List<Team> listAll(UUID cupId) {
    if (!cupRepository.existsById(cupId)) {
      throw new CupNotFoundException("Cup " + cupId + " not found");
    }
    return teamRepository.findByCupIdOrderByCreatedAtAsc(cupId);
  }

  @Transactional
  public Team updateTeam(UUID teamId, JsonNode body) {
    var team = teamRepository.findById(teamId)
        .orElseThrow(() -> new TeamNotFoundException("Team " + teamId + " not found"));

    if (team.getStatus() == TeamStatus.CANCELLED) {
      throw new InvalidTeamTransitionException("Cannot modify a cancelled team");
    }

    var newStatus = readStatus(body);
    var willCancel = newStatus == TeamStatus.CANCELLED
        && team.getStatus() != TeamStatus.CANCELLED;

    Cup lockedCup = null;
    if (willCancel) {
      lockedCup = cupRepository.findByIdForUpdate(team.getCupId())
          .orElseThrow(() -> new CupNotFoundException(
              "Cup " + team.getCupId() + " not found"));
    }

    applyStatusChange(team, newStatus);
    applyGroupChange(team, body);
    applyLogoChange(team, body);

    if (willCancel && lockedCup != null && lockedCup.getStatus() == CupStatus.FULL) {
      var activeCount = teamRepository.countActiveByCupId(team.getCupId());
      if (activeCount < lockedCup.getMaxTeams()) {
        lockedCup.setStatus(CupStatus.OPEN);
      }
    }

    return team;
  }

  private static TeamStatus readStatus(JsonNode body) {
    if (body == null || !body.has("status") || body.get("status").isNull()) {
      return null;
    }
    return TeamStatus.fromJson(body.get("status").asText());
  }

  private static void applyStatusChange(Team team, TeamStatus newStatus) {
    if (newStatus == null || newStatus == team.getStatus()) {
      return;
    }
    team.setStatus(newStatus);
    var now = Instant.now();
    if (newStatus == TeamStatus.PAID) {
      team.setPaidAt(now);
      team.setCancelledAt(null);
    } else if (newStatus == TeamStatus.CANCELLED) {
      team.setCancelledAt(now);
    }
  }

  private static void applyGroupChange(Team team, JsonNode body) {
    if (body == null || !body.has("groupLabel")) {
      return; // field absent in JSON; leave unchanged
    }
    var node = body.get("groupLabel");
    GroupLabel newLabel = node.isNull() ? null : GroupLabel.valueOf(node.asText());
    team.setGroupLabel(newLabel);
  }

  private static void applyLogoChange(Team team, JsonNode body) {
    if (body == null || !body.has("logoUrl")) {
      return; // field absent in JSON; leave unchanged
    }
    var node = body.get("logoUrl");
    team.setLogoUrl(node.isNull() ? "" : node.asText());
  }
}
