package com.cup.backend.postedcups;

import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupDtos.CupResponse;
import com.cup.backend.cups.CupLevelQuota;
import com.cup.backend.cups.CupLevelQuotaRepository;
import com.cup.backend.cups.CupLevelQuotaService;
import com.cup.backend.cups.CupNotFoundException;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.cup.backend.mail.MailSender;
import com.cup.backend.mail.NotificationEvents.CupPosted;
import com.cup.backend.practicematches.InvalidManageTokenException;
import com.cup.backend.practicematches.ManageTokenService;
import com.cup.backend.postedcups.PostedCupDtos.CreatePostedCupResponse;
import com.cup.backend.postedcups.PostedCupDtos.SlotRequest;
import com.cup.backend.postedcups.PostedCupDtos.ManagedCupResponse;
import com.cup.backend.postedcups.PostedCupDtos.PostedCupRequest;
import com.cup.backend.teams.AdminTeamService;
import com.cup.backend.teams.TeamDtos.AdminTeamResponse;
import com.cup.backend.teams.TeamNotFoundException;
import com.cup.backend.teams.TeamRepository;
import com.cup.backend.teams.TeamStatus;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cups posted by anyone, managed with a secret token instead of an admin login. */
@Service
public class PostedCupService {

  private static final Set<Integer> ALLOWED_PLAYERS_PER_TEAM = Set.of(5, 7, 9, 11);
  private static final String DEFAULT_PRIMARY_HSL = "138 59% 30%";
  private static final String DEFAULT_ACCENT_HSL = "42 87% 92%";
  private static final int DEFAULT_PITCH_COUNT = 1;
  private static final int TEAMS_PER_GROUP_TARGET = 4;
  private static final int MAX_GROUPS = 8;
  private static final int MAX_SLUG_LENGTH = 60;

  private final CupRepository cupRepository;
  private final CupLevelQuotaRepository quotaRepository;
  private final CupLevelQuotaService quotaService;
  private final TeamRepository teamRepository;
  private final AdminTeamService adminTeamService;
  private final ManageTokenService tokenService;
  private final ApplicationEventPublisher events;
  private final MailSender mailSender;

  public PostedCupService(
      CupRepository cupRepository,
      CupLevelQuotaRepository quotaRepository,
      CupLevelQuotaService quotaService,
      TeamRepository teamRepository,
      AdminTeamService adminTeamService,
      ManageTokenService tokenService,
      ApplicationEventPublisher events,
      MailSender mailSender) {
    this.cupRepository = cupRepository;
    this.quotaRepository = quotaRepository;
    this.quotaService = quotaService;
    this.teamRepository = teamRepository;
    this.adminTeamService = adminTeamService;
    this.tokenService = tokenService;
    this.events = events;
    this.mailSender = mailSender;
  }

  /** Publishes a cup (status OPEN, visible at once) and returns its one-time manage token. */
  @Transactional
  public CreatePostedCupResponse create(PostedCupRequest request) {
    if (request.website() != null && !request.website().isBlank()) {
      throw new IllegalArgumentException("Request rejected");
    }
    validate(request, 0);
    var token = tokenService.generate();
    var cup = new Cup(
        UUID.randomUUID(),
        uniqueSlug(request.name()),
        request.name().trim(),
        request.organizingClubName().trim(),
        DEFAULT_PRIMARY_HSL,
        DEFAULT_ACCENT_HSL,
        request.startDate(),
        request.endDate(),
        request.venueName().trim(),
        DEFAULT_PITCH_COUNT,
        request.maxTeams(),
        request.registrationFeeSek(),
        "",
        "",
        "",
        request.contactName().trim(),
        request.contactEmail().trim(),
        request.contactPhone().trim(),
        CupStatus.OPEN,
        Instant.now(),
        request.playersPerTeam(),
        "",
        false,
        "",
        false,
        false,
        false,
        "");
    cup.setManageTokenHash(tokenService.hash(token));
    apply(cup, request);
    cupRepository.save(cup);
    replaceQuotas(cup, normalizedSlots(request));
    events.publishEvent(new CupPosted(cup.getId(), token));
    return new CreatePostedCupResponse(response(cup), token, mailSender.enabled());
  }

  /** Organizer view with all teams (including cancelled) and their contact details. */
  @Transactional(readOnly = true)
  public ManagedCupResponse manage(UUID cupId, String token) {
    var cup = authorized(cupId, token);
    var teams = teamRepository.findByCupIdOrderByCreatedAtAsc(cupId).stream()
        .map(AdminTeamResponse::from)
        .toList();
    return new ManagedCupResponse(response(cup), teams);
  }

  /** Replaces the cup's editable fields and level quotas. */
  @Transactional
  public CupResponse update(UUID cupId, String token, PostedCupRequest request) {
    var cup = lockAuthorized(cupId, token);
    var active = (int) teamRepository.countActiveByCupId(cupId);
    validate(request, active);
    requireQuotasCoverRegisteredTeams(cupId, normalizedSlots(request));
    cup.setName(request.name().trim());
    cup.setOrganizingClubName(request.organizingClubName().trim());
    cup.setStartDate(request.startDate());
    cup.setEndDate(request.endDate());
    cup.setVenueName(request.venueName().trim());
    cup.setMaxTeams(request.maxTeams());
    cup.setRegistrationFeeSek(request.registrationFeeSek());
    cup.setOrganizerContactName(request.contactName().trim());
    cup.setOrganizerContactEmail(request.contactEmail().trim());
    cup.setOrganizerContactPhone(request.contactPhone().trim());
    cup.setPlayersPerTeam(request.playersPerTeam());
    apply(cup, request);
    if (cup.getStatus() == CupStatus.OPEN && active >= cup.getMaxTeams()) {
      cup.setStatus(CupStatus.FULL);
    } else if (cup.getStatus() == CupStatus.FULL && active < cup.getMaxTeams()) {
      cup.setStatus(CupStatus.OPEN);
    }
    replaceQuotas(cup, normalizedSlots(request));
    return response(cup);
  }

  /** Marks a team paid / unpaid / cancelled, reusing the admin rules (incl. FULL → OPEN rebound). */
  @Transactional
  public AdminTeamResponse setTeamStatus(UUID cupId, String token, UUID teamId, TeamStatus status) {
    authorized(cupId, token);
    var team = teamRepository.findById(teamId)
        .filter(t -> t.getCupId().equals(cupId))
        .orElseThrow(() -> new TeamNotFoundException("Team " + teamId + " not found"));
    var body = JsonNodeFactory.instance.objectNode().put("status", status.toJson());
    return AdminTeamResponse.from(adminTeamService.updateTeam(team.getId(), body));
  }

  /** Deletes the cup with its teams, registrations, schedule and quotas. */
  @Transactional
  public void delete(UUID cupId, String token) {
    var cup = authorized(cupId, token);
    cupRepository.delete(cup);
  }

  private void apply(Cup cup, PostedCupRequest request) {
    cup.setStartTime(request.startTime());
    cup.setEndTime(request.endTime());
    cup.setAgeClasses(String.join(",", request.ageClasses().stream().map(String::trim).toList()));
    cup.setLevelMin(request.levelMin());
    cup.setLevelMax(request.levelMax());
    cup.setRegistrationDeadline(request.registrationDeadline());
    cup.setExternalRegistrationUrl(blankToNull(request.externalRegistrationUrl()));
    cup.setPaymentLagkassanLink(nullToEmpty(request.paymentLink()).trim());
    cup.setPaymentInstructions(nullToEmpty(request.paymentInstructions()).trim());
    cup.setClubLogoUrl(nullToEmpty(request.clubLogoUrl()).trim());
    cup.setDescription(blankToNull(request.description()));
    cup.setHasToilets(Boolean.TRUE.equals(request.hasToilets()));
    cup.setHasFood(Boolean.TRUE.equals(request.hasFood()));
    cup.setHasParking(Boolean.TRUE.equals(request.hasParking()));
    cup.setMapUrl(nullToEmpty(request.mapUrl()).trim());
    var levels = normalizedSlots(request).stream().map(Slot::level).filter(l -> !l.isEmpty()).distinct().toList();
    cup.setUseLevels(!levels.isEmpty());
    cup.setLevels(String.join(",", levels));
    var groups = Math.max(1, Math.min(MAX_GROUPS, (int) Math.ceil(request.maxTeams() / (double) TEAMS_PER_GROUP_TARGET)));
    cup.setNumberOfGroups(groups);
    cup.setTeamsPerGroup(Math.max(2, (int) Math.ceil(request.maxTeams() / (double) groups)));
  }

  private void validate(PostedCupRequest request, int activeTeams) {
    if (!ALLOWED_PLAYERS_PER_TEAM.contains(request.playersPerTeam())) {
      throw new IllegalArgumentException("playersPerTeam must be one of " + ALLOWED_PLAYERS_PER_TEAM);
    }
    if (request.endDate().isBefore(request.startDate())) {
      throw new IllegalArgumentException("endDate must not be before startDate");
    }
    if (!request.endTime().isAfter(request.startTime())) {
      throw new IllegalArgumentException("endTime must be after startTime");
    }
    if (request.levelMin() > request.levelMax()) {
      throw new IllegalArgumentException("levelMin must not be above levelMax");
    }
    if (request.registrationDeadline() != null && request.registrationDeadline().isAfter(request.endDate())) {
      throw new IllegalArgumentException("registrationDeadline must not be after endDate");
    }
    if (request.maxTeams() < activeTeams) {
      throw new IllegalArgumentException("maxTeams cannot be lower than the number of registered teams (" + activeTeams + ")");
    }
    requireHttpUrl(request.externalRegistrationUrl(), "externalRegistrationUrl");
    requireHttpUrl(request.paymentLink(), "paymentLink");
    requireHttpUrl(request.clubLogoUrl(), "clubLogoUrl");
    requireHttpUrl(request.mapUrl(), "mapUrl");
    validateSlots(request);
  }

  /** A normalized slot row: class/level are '' when not locked on that dimension. */
  private record Slot(String ageClass, String level, int maxTeams) {}

  private static List<String> ageClasses(PostedCupRequest request) {
    return request.ageClasses().stream().map(String::trim).toList();
  }

  /** Slots with trimmed names; single-class cups store '' as class so the class is implicit. */
  private static List<Slot> normalizedSlots(PostedCupRequest request) {
    var multiClass = ageClasses(request).size() > 1;
    var raw = request.slots() == null ? List.<SlotRequest>of() : request.slots();
    return raw.stream()
        .map(s -> new Slot(multiClass ? nullToEmpty(s.ageClass()).trim() : "", nullToEmpty(s.level()).trim(), s.maxTeams()))
        .toList();
  }

  private static void validateSlots(PostedCupRequest request) {
    var classes = ageClasses(request);
    if (new HashSet<>(classes.stream().map(c -> c.toLowerCase(Locale.ROOT)).toList()).size() != classes.size()) {
      throw new IllegalArgumentException("ageClasses must not repeat a class");
    }
    var slots = normalizedSlots(request);
    var multiClass = classes.size() > 1;
    var lockLevels = slots.stream().anyMatch(s -> !s.level().isEmpty());
    if (multiClass && slots.isEmpty()) {
      throw new IllegalArgumentException("slots are required per age class when the cup has several classes");
    }
    if (!multiClass && !slots.isEmpty() && !lockLevels) {
      throw new IllegalArgumentException("slots without levels are only used when the cup has several classes");
    }
    if (lockLevels && slots.stream().anyMatch(s -> s.level().isEmpty())) {
      throw new IllegalArgumentException("every slot needs a level when levels are locked");
    }
    var seen = new HashSet<String>();
    for (var slot : slots) {
      if (slot.level().contains(",")) {
        throw new IllegalArgumentException("level names cannot contain commas");
      }
      if (multiClass && classes.stream().noneMatch(c -> c.equalsIgnoreCase(slot.ageClass()))) {
        throw new IllegalArgumentException("slot class " + slot.ageClass() + " is not one of the cup's classes");
      }
      if (!seen.add((slot.ageClass() + "|" + slot.level()).toLowerCase(Locale.ROOT))) {
        throw new IllegalArgumentException("slots must not repeat a class and level");
      }
    }
    if (multiClass) {
      for (var cls : classes) {
        if (slots.stream().noneMatch(s -> s.ageClass().equalsIgnoreCase(cls))) {
          throw new IllegalArgumentException("slots are missing for class " + cls);
        }
      }
    }
    if (!slots.isEmpty()) {
      var sum = slots.stream().mapToInt(Slot::maxTeams).sum();
      if (sum != request.maxTeams()) {
        throw new IllegalArgumentException("slots must add up to maxTeams (" + sum + " of " + request.maxTeams() + ")");
      }
    }
  }

  private void requireQuotasCoverRegisteredTeams(UUID cupId, List<Slot> slots) {
    if (slots.isEmpty()) {
      return;
    }
    var taken = new HashMap<Slot, Integer>();
    for (var row : teamRepository.countActiveByClassAndLevel(cupId)) {
      var ageClass = nullToEmpty((String) row[0]);
      var level = nullToEmpty((String) row[1]);
      var count = ((Long) row[2]).intValue();
      var match = slots.stream()
          .filter(s -> s.ageClass().isEmpty() || s.ageClass().equalsIgnoreCase(ageClass))
          .filter(s -> s.level().isEmpty() || s.level().equalsIgnoreCase(level))
          .findFirst()
          .orElseThrow(() -> new IllegalArgumentException(
              "Registered teams in " + (ageClass + " " + level).trim() + " would have no slot"));
      taken.merge(match, count, Integer::sum);
    }
    taken.forEach((slot, count) -> {
      if (slot.maxTeams() < count) {
        throw new IllegalArgumentException(
            (slot.ageClass() + " " + slot.level()).trim() + " already has " + count + " registered teams");
      }
    });
  }

  private void replaceQuotas(Cup cup, List<Slot> slots) {
    quotaRepository.deleteByCupId(cup.getId());
    quotaRepository.flush();
    var rows = new ArrayList<CupLevelQuota>();
    for (var i = 0; i < slots.size(); i++) {
      var slot = slots.get(i);
      rows.add(new CupLevelQuota(cup.getId(), slot.ageClass(), slot.level(), slot.maxTeams(), i));
    }
    quotaRepository.saveAll(rows);
  }

  private CupResponse response(Cup cup) {
    var active = (int) teamRepository.countActiveByCupId(cup.getId());
    return CupResponse.from(cup, active, quotaService.quotasWithRemaining(cup.getId()));
  }

  private Cup authorized(UUID cupId, String token) {
    var cup = cupRepository.findById(cupId)
        .orElseThrow(() -> new CupNotFoundException("Cup " + cupId + " not found"));
    requireToken(cup, token);
    return cup;
  }

  private Cup lockAuthorized(UUID cupId, String token) {
    var cup = cupRepository.findByIdForUpdate(cupId)
        .orElseThrow(() -> new CupNotFoundException("Cup " + cupId + " not found"));
    requireToken(cup, token);
    return cup;
  }

  private void requireToken(Cup cup, String token) {
    // Admin-created cups have no token hash and can only be managed through the admin login.
    if (!tokenService.matches(token, cup.getManageTokenHash())) {
      throw new InvalidManageTokenException("Invalid manage token");
    }
  }

  private String uniqueSlug(String name) {
    var base = slugify(name);
    var candidate = base;
    var suffix = 2;
    while (cupRepository.existsBySlug(candidate)) {
      candidate = base + "-" + suffix++;
    }
    return candidate;
  }

  /** "Grimsta Höstcup 2026" → "grimsta-hostcup-2026". */
  static String slugify(String name) {
    var ascii = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    var slug = ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    if (slug.length() > MAX_SLUG_LENGTH) {
      slug = slug.substring(0, MAX_SLUG_LENGTH).replaceAll("-$", "");
    }
    return slug.isEmpty() ? "cup" : slug;
  }

  private static void requireHttpUrl(String value, String field) {
    if (value != null && !value.isBlank() && !value.trim().matches("(?i)^https?://\\S+$")) {
      throw new IllegalArgumentException(field + " must be an http(s) link");
    }
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
