package com.cup.backend.cups;

import com.cup.backend.cups.CupDtos.SlotQuotaResponse;
import com.cup.backend.teams.CupFullException;
import com.cup.backend.teams.TeamRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads optional slot quotas (per class and/or level) and enforces them on registration. */
@Service
public class CupLevelQuotaService {

  private final CupLevelQuotaRepository quotaRepository;
  private final TeamRepository teamRepository;

  public CupLevelQuotaService(CupLevelQuotaRepository quotaRepository, TeamRepository teamRepository) {
    this.quotaRepository = quotaRepository;
    this.teamRepository = teamRepository;
  }

  /** A requested slot for one new team. Null parts mean the team has no class/level. */
  public record Slot(String ageClass, String level) {}

  /** Quotas with remaining slots; empty when nothing is locked. */
  @Transactional(readOnly = true)
  public List<SlotQuotaResponse> quotasWithRemaining(UUID cupId) {
    var quotas = quotaRepository.findByCupId(cupId);
    if (quotas.isEmpty()) {
      return List.of();
    }
    var taken = takenByQuota(cupId, quotas);
    return quotas.stream()
        .map(q -> new SlotQuotaResponse(
            q.getAgeClass(),
            q.getLevel(),
            q.getMaxTeams(),
            Math.max(0, q.getMaxTeams() - taken.getOrDefault(key(q.getAgeClass(), q.getLevel()), 0))))
        .toList();
  }

  /**
   * Rejects a registration whose slots are not offered or would overfill a quota. Call with the cup
   * row locked so concurrent registrations are serialized. No-op for cups without quotas.
   */
  public void requireCapacity(UUID cupId, List<Slot> newTeams) {
    var quotas = quotaRepository.findByCupId(cupId);
    if (quotas.isEmpty()) {
      return;
    }
    var taken = takenByQuota(cupId, quotas);
    var requested = new HashMap<String, Integer>();
    for (var slot : newTeams) {
      var quota = matching(quotas, slot)
          .orElseThrow(() -> new IllegalArgumentException("Choose a class and level offered by this cup"));
      requested.merge(key(quota.getAgeClass(), quota.getLevel()), 1, Integer::sum);
    }
    for (var quota : quotas) {
      var k = key(quota.getAgeClass(), quota.getLevel());
      var wanted = requested.getOrDefault(k, 0);
      if (wanted > 0 && taken.getOrDefault(k, 0) + wanted > quota.getMaxTeams()) {
        throw new CupFullException("No remaining slots in " + describe(quota));
      }
    }
  }

  /** Active teams counted against each quota (a team counts toward the quota its class/level matches). */
  private Map<String, Integer> takenByQuota(UUID cupId, List<CupLevelQuota> quotas) {
    var taken = new HashMap<String, Integer>();
    for (var row : teamRepository.countActiveByClassAndLevel(cupId)) {
      var slot = new Slot((String) row[0], (String) row[1]);
      var count = ((Long) row[2]).intValue();
      matching(quotas, slot).ifPresent(q -> taken.merge(key(q.getAgeClass(), q.getLevel()), count, Integer::sum));
    }
    return taken;
  }

  private static Optional<CupLevelQuota> matching(List<CupLevelQuota> quotas, Slot slot) {
    return quotas.stream()
        .filter(q -> q.getAgeClass().isEmpty() || q.getAgeClass().equalsIgnoreCase(nullToEmpty(slot.ageClass())))
        .filter(q -> q.getLevel().isEmpty() || q.getLevel().equalsIgnoreCase(nullToEmpty(slot.level())))
        .findFirst();
  }

  private static String key(String ageClass, String level) {
    return ageClass.toLowerCase(Locale.ROOT) + "|" + level.toLowerCase(Locale.ROOT);
  }

  private static String describe(CupLevelQuota quota) {
    return String.join(" ", List.of(quota.getAgeClass(), quota.getLevel()).stream().filter(s -> !s.isEmpty()).toList());
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
