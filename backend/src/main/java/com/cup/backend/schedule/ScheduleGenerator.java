package com.cup.backend.schedule;

import com.cup.backend.teams.GroupLabel;
import com.cup.backend.teams.Team;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Pure round-robin schedule generator. Mirrors
 * {@code frontend/src/features/schedule/scheduleGenerator.ts}.
 *
 * <p>Six time slots, alternating groups: even slots run a Group A round (both
 * matches in parallel on pitches 1 and 2); odd slots run a Group B round.
 * Every team plays exactly three matches with a uniform 1-slot rest.
 */
public final class ScheduleGenerator {

  private static final int[][][] ROUND_PAIRINGS = {
      {{0, 1}, {2, 3}},  // R1: (t0, t1) on pitch 1, (t2, t3) on pitch 2
      {{0, 2}, {1, 3}},  // R2: (t0, t2),               (t1, t3)
      {{0, 3}, {1, 2}},  // R3: (t0, t3),               (t1, t2)
  };

  private static final int TEAMS_PER_GROUP = 4;
  private static final int ROUNDS = 3;
  private static final int SLOTS = 6;
  private static final int PITCH_1 = 1;
  private static final int PITCH_2 = 2;
  private static final long MS_PER_MINUTE = 60_000L;

  private ScheduleGenerator() {
    // Static helper.
  }

  public static List<MatchSpec> generate(GenerationInput input) {
    if (input.groupATeams().size() != TEAMS_PER_GROUP
        || input.groupBTeams().size() != TEAMS_PER_GROUP) {
      throw new IllegalArgumentException("Each group must have exactly 4 teams");
    }
    if (input.matchDurationMinutes() <= 0 || input.breakBetweenMatchesMinutes() < 0) {
      throw new IllegalArgumentException(
          "Match duration must be positive and break must be non-negative");
    }

    var slotMs = (long) (input.matchDurationMinutes() + input.breakBetweenMatchesMinutes())
        * MS_PER_MINUTE;
    var baseMs = input.startTime().toEpochMilli();
    var matches = new ArrayList<MatchSpec>(SLOTS * 2);

    for (int slot = 0; slot < SLOTS; slot++) {
      var isGroupA = slot % 2 == 0;
      var round = slot / 2;
      if (round >= ROUNDS) {
        break;
      }
      var teams = isGroupA ? input.groupATeams() : input.groupBTeams();
      var groupLabel = isGroupA ? GroupLabel.A : GroupLabel.B;
      var slotStart = Instant.ofEpochMilli(baseMs + (long) slot * slotMs);

      var pairings = ROUND_PAIRINGS[round];
      for (int m = 0; m < pairings.length; m++) {
        var homeIdx = pairings[m][0];
        var awayIdx = pairings[m][1];
        var pitch = m == 0 ? PITCH_1 : PITCH_2;
        matches.add(new MatchSpec(
            input.cupId(),
            groupLabel,
            pitch,
            slotStart,
            teams.get(homeIdx).getId(),
            teams.get(awayIdx).getId()));
      }
    }

    return matches;
  }

  public record GenerationInput(
      UUID cupId,
      List<Team> groupATeams,
      List<Team> groupBTeams,
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
