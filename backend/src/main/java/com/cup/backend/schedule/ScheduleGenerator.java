package com.cup.backend.schedule;

import com.cup.backend.teams.GroupLabel;
import com.cup.backend.teams.Team;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Parametric round-robin schedule generator for N groups of M teams. Each
 * group plays a single round-robin (M-1 rounds when M is even, M when odd with
 * one bye per round). Group rounds are interleaved by slot: slot {@code s}
 * runs group {@code s % N}'s round {@code s / N}, with matches assigned
 * sequentially to pitches 1..K within the slot.
 */
public final class ScheduleGenerator {

  private static final int MIN_TEAMS_PER_GROUP = 2;
  private static final long MS_PER_MINUTE = 60_000L;

  private ScheduleGenerator() {
    // Static helper.
  }

  public static List<MatchSpec> generate(GenerationInput input) {
    var groups = orderedGroups(input.teamsByGroup());
    if (groups.isEmpty()) {
      throw new IllegalArgumentException("At least one group is required");
    }
    var teamsPerGroup = groups.getFirst().getValue().size();
    if (teamsPerGroup < MIN_TEAMS_PER_GROUP) {
      throw new IllegalArgumentException(
          "Each group must have at least " + MIN_TEAMS_PER_GROUP + " teams");
    }
    for (var entry : groups) {
      if (entry.getValue().size() != teamsPerGroup) {
        throw new IllegalArgumentException(
            "All groups must have the same number of teams (group "
                + entry.getKey() + " has " + entry.getValue().size()
                + ", expected " + teamsPerGroup + ")");
      }
    }
    if (input.matchDurationMinutes() <= 0 || input.breakBetweenMatchesMinutes() < 0) {
      throw new IllegalArgumentException(
          "Match duration must be positive and break must be non-negative");
    }

    var roundsPerGroup = roundRobin(teamsPerGroup);
    var slotMs = (long) (input.matchDurationMinutes() + input.breakBetweenMatchesMinutes())
        * MS_PER_MINUTE;
    var baseMs = input.startTime().toEpochMilli();
    var matches = new ArrayList<MatchSpec>();

    for (int round = 0; round < roundsPerGroup.size(); round++) {
      var pairings = roundsPerGroup.get(round);
      for (int g = 0; g < groups.size(); g++) {
        var slot = round * groups.size() + g;
        var slotStart = Instant.ofEpochMilli(baseMs + (long) slot * slotMs);
        var entry = groups.get(g);
        var teams = entry.getValue();
        for (int m = 0; m < pairings.size(); m++) {
          var pair = pairings.get(m);
          matches.add(new MatchSpec(
              input.cupId(),
              entry.getKey(),
              m + 1,
              slotStart,
              teams.get(pair[0]).getId(),
              teams.get(pair[1]).getId()));
        }
      }
    }

    return matches;
  }

  /**
   * Circle-method round-robin pairings for {@code m} teams. Returns one inner
   * list per round; each inner list contains real-team-index pairs (byes
   * stripped for odd {@code m}).
   */
  private static List<List<int[]>> roundRobin(int m) {
    var size = m % 2 == 0 ? m : m + 1;
    var byeIndex = m;
    var positions = new int[size];
    for (int i = 0; i < size; i++) {
      positions[i] = i;
    }
    var rounds = new ArrayList<List<int[]>>(size - 1);
    for (int r = 0; r < size - 1; r++) {
      var round = new ArrayList<int[]>(size / 2);
      for (int i = 0; i < size / 2; i++) {
        var a = positions[i];
        var b = positions[size - 1 - i];
        if (a != byeIndex && b != byeIndex) {
          round.add(new int[] {a, b});
        }
      }
      rounds.add(round);
      rotate(positions);
    }
    return rounds;
  }

  /** Standard circle rotation: index 0 stays fixed, others rotate clockwise. */
  private static void rotate(int[] positions) {
    if (positions.length <= 2) {
      return;
    }
    var last = positions[positions.length - 1];
    for (int i = positions.length - 1; i > 1; i--) {
      positions[i] = positions[i - 1];
    }
    positions[1] = last;
  }

  private static List<Map.Entry<GroupLabel, List<Team>>> orderedGroups(
      Map<GroupLabel, List<Team>> teamsByGroup) {
    var ordered = new LinkedHashMap<GroupLabel, List<Team>>();
    teamsByGroup.entrySet().stream()
        .sorted(Comparator.comparingInt(e -> e.getKey().ordinal()))
        .forEach(e -> ordered.put(e.getKey(), e.getValue()));
    return new ArrayList<>(ordered.entrySet());
  }

  public record GenerationInput(
      UUID cupId,
      Map<GroupLabel, List<Team>> teamsByGroup,
      Instant startTime,
      int matchDurationMinutes,
      int breakBetweenMatchesMinutes) {}

  /** Match data without an id; the service stamps a UUID at persistence time. */
  public record MatchSpec(
      UUID cupId,
      GroupLabel groupLabel,
      int pitch,
      Instant startTime,
      UUID homeTeamId,
      UUID awayTeamId) {}
}
