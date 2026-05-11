package com.cup.backend.teams;

import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupNotFoundException;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.cup.backend.teams.TeamDtos.PublicTeam;
import com.cup.backend.teams.TeamDtos.RegistrationCreateRequest;
import com.cup.backend.teams.TeamDtos.RegistrationCreateResponse;
import com.cup.backend.teams.TeamDtos.RegistrationDetail;
import com.cup.backend.teams.TeamDtos.RegistrationSummary;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Public team registration. Atomic insert + cup-status auto-transition under a row lock. */
@Service
public class RegistrationService {

  private static final int MIN_TEAM_NAMES = 1;
  private static final int MAX_TEAM_NAMES = 2;

  private final CupRepository cupRepository;
  private final TeamRepository teamRepository;
  private final RegistrationRepository registrationRepository;

  public RegistrationService(
      CupRepository cupRepository,
      TeamRepository teamRepository,
      RegistrationRepository registrationRepository) {
    this.cupRepository = cupRepository;
    this.teamRepository = teamRepository;
    this.registrationRepository = registrationRepository;
  }

  @Transactional
  public RegistrationCreateResponse register(UUID cupId, RegistrationCreateRequest request) {
    var cup = cupRepository.findByIdForUpdate(cupId)
        .orElseThrow(() -> new CupNotFoundException("Cup " + cupId + " not found"));

    if (cup.getStatus() != CupStatus.OPEN) {
      throw new CupNotOpenException("Registration is not open for this cup");
    }

    var trimmedNames = trimAndValidateNames(request.teamNames());
    rejectDuplicateNamesInRequest(trimmedNames);

    var existingActive = teamRepository.findActiveByCupId(cup.getId());
    rejectCollisionsAgainst(existingActive, trimmedNames);

    if (existingActive.size() + trimmedNames.size() > cup.getMaxTeams()) {
      throw new CupFullException("No remaining capacity for this cup");
    }

    var resolvedLevels = resolveTeamLevels(cup, trimmedNames.size(), request.teamLevels());

    var now = Instant.now();
    var registration = new Registration(UUID.randomUUID(), cup.getId(), now);
    registrationRepository.save(registration);

    var newTeams = new ArrayList<Team>(trimmedNames.size());
    for (var i = 0; i < trimmedNames.size(); i++) {
      var team = new Team(
          UUID.randomUUID(),
          cup.getId(),
          registration.getId(),
          trimmedNames.get(i),
          request.clubName().trim(),
          request.contactName().trim(),
          request.contactEmail().trim(),
          request.contactPhone().trim(),
          null,
          TeamStatus.RESERVED,
          now);
      team.setLevel(resolvedLevels.get(i));
      newTeams.add(teamRepository.save(team));
    }

    var newActiveCount = existingActive.size() + newTeams.size();
    if (newActiveCount >= cup.getMaxTeams()) {
      cup.setStatus(CupStatus.FULL);
    }

    return new RegistrationCreateResponse(
        registration.getId(),
        newTeams.stream().map(Team::getId).toList());
  }

  @Transactional(readOnly = true)
  public List<PublicTeam> listPublicTeams(UUID cupId) {
    if (!cupRepository.existsById(cupId)) {
      throw new CupNotFoundException("Cup " + cupId + " not found");
    }
    return teamRepository.findActiveByCupId(cupId).stream()
        .map(PublicTeam::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public RegistrationDetail findRegistration(UUID id) {
    var registration = registrationRepository.findById(id)
        .orElseThrow(() -> new RegistrationNotFoundException(
            "Registration " + id + " not found"));
    var teams = teamRepository.findByRegistrationIdOrderByCreatedAtAsc(id);
    var teamIds = teams.stream().map(Team::getId).toList();
    var publicTeams = teams.stream().map(PublicTeam::from).toList();
    return new RegistrationDetail(
        RegistrationSummary.from(registration, teamIds),
        publicTeams);
  }

  private static List<String> trimAndValidateNames(List<String> raw) {
    if (raw == null || raw.size() < MIN_TEAM_NAMES || raw.size() > MAX_TEAM_NAMES) {
      throw new IllegalArgumentException("teamNames must contain 1 or 2 entries");
    }
    var trimmed = raw.stream().map(name -> name == null ? "" : name.trim()).toList();
    if (trimmed.stream().anyMatch(String::isEmpty)) {
      throw new IllegalArgumentException("Team names cannot be empty");
    }
    return trimmed;
  }

  private static void rejectDuplicateNamesInRequest(List<String> trimmedNames) {
    if (trimmedNames.size() == 2
        && trimmedNames.get(0).equalsIgnoreCase(trimmedNames.get(1))) {
      throw new IllegalArgumentException("Team names must differ");
    }
  }

  private static void rejectCollisionsAgainst(List<Team> existingActive, List<String> trimmedNames) {
    for (var name : trimmedNames) {
      var collides = existingActive.stream()
          .anyMatch(team -> team.getName().trim().equalsIgnoreCase(name));
      if (collides) {
        throw new TeamNameConflictException(name);
      }
    }
  }

  /**
   * Resolves per-team level. When the cup uses levels, requires one entry per team
   * matching one of the cup's configured levels. When levels are off, returns nulls.
   */
  private static List<String> resolveTeamLevels(Cup cup, int teamCount, List<String> raw) {
    if (!cup.isUseLevels()) {
      var nulls = new ArrayList<String>(teamCount);
      for (var i = 0; i < teamCount; i++) {
        nulls.add(null);
      }
      return nulls;
    }
    if (raw == null || raw.size() != teamCount) {
      throw new IllegalArgumentException("teamLevels must contain one entry per team");
    }
    var allowed = Arrays.stream(cup.getLevels().split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .collect(Collectors.toCollection(LinkedHashSet::new));
    var resolved = new ArrayList<String>(teamCount);
    for (var entry : raw) {
      var trimmed = entry == null ? "" : entry.trim();
      if (trimmed.isEmpty()) {
        throw new IllegalArgumentException("teamLevels entries cannot be empty");
      }
      var match = allowed.stream()
          .filter(level -> level.equalsIgnoreCase(trimmed))
          .findFirst()
          .orElseThrow(() -> new IllegalArgumentException(
              "Unknown level \"" + trimmed + "\" — allowed: " + allowed));
      resolved.add(match);
    }
    return resolved;
  }
}
