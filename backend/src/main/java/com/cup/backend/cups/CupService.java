package com.cup.backend.cups;

import com.cup.backend.cups.CupDtos.CupCreateRequest;
import com.cup.backend.cups.CupDtos.CupUpdateRequest;
import com.cup.backend.teams.TeamRepository;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cup CRUD + validation. */
@Service
public class CupService {

  private static final Set<Integer> ALLOWED_PLAYERS_PER_TEAM = Set.of(5, 7, 9);
  private static final int DEFAULT_PLAYERS_PER_TEAM = 7;
  private static final int MIN_GROUPS = 1;
  private static final int MAX_GROUPS = 8;
  private static final int MIN_TEAMS_PER_GROUP = 2;

  private final CupRepository repository;
  private final TeamRepository teamRepository;

  public CupService(CupRepository repository, TeamRepository teamRepository) {
    this.repository = repository;
    this.teamRepository = teamRepository;
  }

  @Transactional(readOnly = true)
  public List<Cup> listAll() {
    return repository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
  }

  /** Public landing list: published cups (anything except DRAFT), sorted by date then name. */
  @Transactional(readOnly = true)
  public List<Cup> listPublic() {
    return repository.findByStatusNotOrderByStartDateAscNameAsc(CupStatus.DRAFT);
  }

  /** Count of non-cancelled teams; surfaced as {@code activeTeamCount} in the response. */
  @Transactional(readOnly = true)
  public int countActiveTeams(UUID cupId) {
    return Math.toIntExact(teamRepository.countActiveByCupId(cupId));
  }

  @Transactional(readOnly = true)
  public Cup getById(UUID id) {
    return repository.findById(id)
        .orElseThrow(() -> new CupNotFoundException("Cup " + id + " not found"));
  }

  @Transactional(readOnly = true)
  public Cup getBySlug(String slug) {
    return repository.findBySlug(slug)
        .orElseThrow(() -> new CupNotFoundException("Cup with slug \"" + slug + "\" not found"));
  }

  @Transactional
  public Cup create(CupCreateRequest req) {
    requireDateOrder(req.startDate(), req.endDate());
    if (repository.existsBySlug(req.slug())) {
      throw new SlugConflictException(req.slug());
    }
    var playersPerTeam = requirePlayersPerTeam(req.playersPerTeam());
    var useLevels = req.useLevels() != null && req.useLevels();
    var levelsCsv = normalizeLevels(req.levels(), useLevels);
    var cup = new Cup(
        UUID.randomUUID(),
        req.slug(),
        req.name(),
        req.organizingClubName(),
        req.organizingClubColors().primary(),
        req.organizingClubColors().accent(),
        req.startDate(),
        req.endDate(),
        req.venueName(),
        req.pitchCount(),
        req.maxTeams(),
        req.registrationFeeSek(),
        nullToEmpty(req.paymentInstructions()),
        nullToEmpty(req.paymentLagkassanLink()),
        nullToEmpty(req.paymentLagkassanQrUrl()),
        req.organizerContactName(),
        req.organizerContactEmail(),
        req.organizerContactPhone(),
        CupStatus.DRAFT,
        Instant.now(),
        playersPerTeam,
        nullToEmpty(req.clubLogoUrl()),
        useLevels,
        levelsCsv,
        Boolean.TRUE.equals(req.hasToilets()),
        Boolean.TRUE.equals(req.hasFood()),
        Boolean.TRUE.equals(req.hasParking()),
        nullToEmpty(req.mapUrl()));
    cup.setStartTime(req.startTime());
    cup.setNumberOfGroups(requireNumberOfGroups(req.numberOfGroups()));
    cup.setTeamsPerGroup(requireTeamsPerGroup(req.teamsPerGroup()));
    return repository.save(cup);
  }

  @Transactional
  public Cup update(UUID id, CupUpdateRequest req) {
    var cup = getById(id);

    if (req.slug() != null && !req.slug().equals(cup.getSlug())) {
      if (!req.slug().matches("^[a-z0-9-]+$")) {
        throw new IllegalArgumentException("slug must match [a-z0-9-]+");
      }
      if (repository.existsBySlugAndIdNot(req.slug(), id)) {
        throw new SlugConflictException(req.slug());
      }
      cup.setSlug(req.slug());
    }
    if (req.name() != null) cup.setName(req.name());
    if (req.organizingClubName() != null) cup.setOrganizingClubName(req.organizingClubName());
    if (req.organizingClubColors() != null) {
      cup.setPrimaryColorHsl(req.organizingClubColors().primary());
      cup.setAccentColorHsl(req.organizingClubColors().accent());
    }
    if (req.startDate() != null) cup.setStartDate(req.startDate());
    if (req.endDate() != null) cup.setEndDate(req.endDate());
    requireDateOrder(cup.getStartDate(), cup.getEndDate());
    if (req.venueName() != null) cup.setVenueName(req.venueName());
    if (req.pitchCount() != null) {
      if (req.pitchCount() < 1) {
        throw new IllegalArgumentException("pitchCount must be at least 1");
      }
      cup.setPitchCount(req.pitchCount());
    }
    if (req.maxTeams() != null) {
      if (req.maxTeams() < 2) {
        throw new IllegalArgumentException("maxTeams must be at least 2");
      }
      cup.setMaxTeams(req.maxTeams());
    }
    if (req.registrationFeeSek() != null) {
      if (req.registrationFeeSek() < 0) {
        throw new IllegalArgumentException("registrationFeeSek must be non-negative");
      }
      cup.setRegistrationFeeSek(req.registrationFeeSek());
    }
    if (req.paymentInstructions() != null) cup.setPaymentInstructions(req.paymentInstructions());
    if (req.paymentLagkassanLink() != null) cup.setPaymentLagkassanLink(req.paymentLagkassanLink());
    if (req.paymentLagkassanQrUrl() != null) cup.setPaymentLagkassanQrUrl(req.paymentLagkassanQrUrl());
    if (req.organizerContactName() != null) cup.setOrganizerContactName(req.organizerContactName());
    if (req.organizerContactEmail() != null) cup.setOrganizerContactEmail(req.organizerContactEmail());
    if (req.organizerContactPhone() != null) cup.setOrganizerContactPhone(req.organizerContactPhone());
    if (req.status() != null) cup.setStatus(req.status());
    if (req.playersPerTeam() != null) {
      cup.setPlayersPerTeam(requirePlayersPerTeam(req.playersPerTeam()));
    }
    if (req.clubLogoUrl() != null) cup.setClubLogoUrl(req.clubLogoUrl());
    var nextUseLevels = req.useLevels() != null ? req.useLevels() : cup.isUseLevels();
    var nextLevels = req.levels();
    if (req.useLevels() != null || nextLevels != null) {
      var resolvedLevels = nextLevels != null
          ? nextLevels
          : splitLevels(cup.getLevels());
      cup.setUseLevels(nextUseLevels);
      cup.setLevels(normalizeLevels(resolvedLevels, nextUseLevels));
    }
    if (req.hasToilets() != null) cup.setHasToilets(req.hasToilets());
    if (req.hasFood() != null) cup.setHasFood(req.hasFood());
    if (req.hasParking() != null) cup.setHasParking(req.hasParking());
    if (req.mapUrl() != null) cup.setMapUrl(req.mapUrl());
    if (req.startTime() != null) cup.setStartTime(req.startTime());
    if (req.numberOfGroups() != null) {
      cup.setNumberOfGroups(requireNumberOfGroups(req.numberOfGroups()));
    }
    if (req.teamsPerGroup() != null) {
      cup.setTeamsPerGroup(requireTeamsPerGroup(req.teamsPerGroup()));
    }

    return cup;
  }

  @Transactional
  public void delete(UUID id) {
    if (!repository.existsById(id)) {
      throw new CupNotFoundException("Cup " + id + " not found");
    }
    repository.deleteById(id);
  }

  private static void requireDateOrder(java.time.LocalDate start, java.time.LocalDate end) {
    if (start != null && end != null && start.isAfter(end)) {
      throw new IllegalArgumentException("startDate must be on or before endDate");
    }
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }

  private static int requirePlayersPerTeam(Integer value) {
    var resolved = value == null ? DEFAULT_PLAYERS_PER_TEAM : value;
    if (!ALLOWED_PLAYERS_PER_TEAM.contains(resolved)) {
      throw new IllegalArgumentException("playersPerTeam must be 5, 7, or 9");
    }
    return resolved;
  }

  private static int requireNumberOfGroups(Integer value) {
    var resolved = value == null ? 2 : value;
    if (resolved < MIN_GROUPS || resolved > MAX_GROUPS) {
      throw new IllegalArgumentException(
          "numberOfGroups must be between " + MIN_GROUPS + " and " + MAX_GROUPS);
    }
    return resolved;
  }

  private static int requireTeamsPerGroup(Integer value) {
    var resolved = value == null ? 4 : value;
    if (resolved < MIN_TEAMS_PER_GROUP) {
      throw new IllegalArgumentException(
          "teamsPerGroup must be at least " + MIN_TEAMS_PER_GROUP);
    }
    return resolved;
  }

  /**
   * Trims, drops blanks, dedupes case-insensitively, and serializes as CSV.
   * Returns "" when {@code useLevels=false}; requires at least 2 levels otherwise.
   */
  private static String normalizeLevels(List<String> levels, boolean useLevels) {
    if (!useLevels) {
      return "";
    }
    if (levels == null) {
      throw new IllegalArgumentException("levels must contain at least 2 entries when useLevels=true");
    }
    var seen = new LinkedHashSet<String>();
    for (var raw : levels) {
      if (raw == null) continue;
      var trimmed = raw.trim();
      if (trimmed.isEmpty()) continue;
      if (trimmed.contains(",")) {
        throw new IllegalArgumentException("level names cannot contain commas");
      }
      seen.add(trimmed);
    }
    if (seen.size() < 2) {
      throw new IllegalArgumentException("levels must contain at least 2 distinct entries when useLevels=true");
    }
    return seen.stream().collect(Collectors.joining(","));
  }

  private static List<String> splitLevels(String csv) {
    if (csv == null || csv.isBlank()) {
      return List.of();
    }
    return Arrays.stream(csv.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .toList();
  }
}
