package com.cup.backend.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cup.backend.schedule.ScheduleGenerator.GenerationInput;
import com.cup.backend.schedule.ScheduleGenerator.MatchSpec;
import com.cup.backend.teams.GroupLabel;
import com.cup.backend.teams.Team;
import com.cup.backend.teams.TeamStatus;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ScheduleGeneratorTest {

  private static final Instant START = Instant.parse("2026-06-01T10:00:00Z");
  private static final UUID CUP_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

  private static Team team(String name) {
    return new Team(
        UUID.randomUUID(), CUP_ID, UUID.randomUUID(),
        name, "Club", "C", "c@example.com", "0",
        null, TeamStatus.PAID, START);
  }

  private static List<Team> teams(String prefix, int count) {
    var list = new java.util.ArrayList<Team>(count);
    for (int i = 0; i < count; i++) {
      list.add(team(prefix + (i + 1)));
    }
    return list;
  }

  private static GenerationInput inputFor(Map<GroupLabel, List<Team>> groups) {
    return new GenerationInput(CUP_ID, groups, START, 15, 5);
  }

  @Test
  void twoByFourProducesTwelveMatchesAcrossSixSlotsAndTwoPitches() {
    var groups = new LinkedHashMap<GroupLabel, List<Team>>();
    groups.put(GroupLabel.A, teams("A", 4));
    groups.put(GroupLabel.B, teams("B", 4));
    var input = inputFor(groups);

    var matches = ScheduleGenerator.generate(input);

    assertThat(matches).hasSize(12);
    assertEachTeamPlays(matches, groups, 3);
    assertEachPairPlaysOnceWithinGroup(matches, groups);
    assertGroupsAlternateBySlot(matches, List.of(GroupLabel.A, GroupLabel.B));
    assertPitchesAreContiguousFromOne(matches, 2);
    assertSlotSpacingMatches(matches, 15, 5);
  }

  @Test
  void threeByFourProducesEighteenMatchesAcrossNineSlots() {
    var groups = new LinkedHashMap<GroupLabel, List<Team>>();
    groups.put(GroupLabel.A, teams("A", 4));
    groups.put(GroupLabel.B, teams("B", 4));
    groups.put(GroupLabel.C, teams("C", 4));
    var input = inputFor(groups);

    var matches = ScheduleGenerator.generate(input);

    assertThat(matches).hasSize(18);
    assertEachTeamPlays(matches, groups, 3);
    assertEachPairPlaysOnceWithinGroup(matches, groups);
    assertGroupsAlternateBySlot(matches, List.of(GroupLabel.A, GroupLabel.B, GroupLabel.C));
    assertPitchesAreContiguousFromOne(matches, 2);
  }

  @Test
  void twoByFiveProducesTwentyMatchesAcrossTenSlotsWithByes() {
    var groups = new LinkedHashMap<GroupLabel, List<Team>>();
    groups.put(GroupLabel.A, teams("A", 5));
    groups.put(GroupLabel.B, teams("B", 5));
    var input = inputFor(groups);

    var matches = ScheduleGenerator.generate(input);

    // 5 teams round-robin = 10 matches per group * 2 groups = 20 matches
    assertThat(matches).hasSize(20);
    assertEachTeamPlays(matches, groups, 4);
    assertEachPairPlaysOnceWithinGroup(matches, groups);
    assertGroupsAlternateBySlot(matches, List.of(GroupLabel.A, GroupLabel.B));
    // Odd-team rounds have only (M-1)/2 = 2 matches per slot, on pitches 1 and 2.
    assertPitchesAreContiguousFromOne(matches, 2);
  }

  @Test
  void slotTimestampsAreSpacedByDurationPlusBreak() {
    var groups = new LinkedHashMap<GroupLabel, List<Team>>();
    groups.put(GroupLabel.A, teams("A", 4));
    groups.put(GroupLabel.B, teams("B", 4));

    var matches = ScheduleGenerator.generate(inputFor(groups));

    assertSlotSpacingMatches(matches, 15, 5);
  }

  @Test
  void throwsWhenGroupsHaveDifferentSizes() {
    var groups = new LinkedHashMap<GroupLabel, List<Team>>();
    groups.put(GroupLabel.A, teams("A", 4));
    groups.put(GroupLabel.B, teams("B", 3));

    assertThatThrownBy(() -> ScheduleGenerator.generate(inputFor(groups)))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("same number of teams");
  }

  @Test
  void throwsWhenGroupHasFewerThanTwoTeams() {
    var groups = new LinkedHashMap<GroupLabel, List<Team>>();
    groups.put(GroupLabel.A, teams("A", 1));
    groups.put(GroupLabel.B, teams("B", 1));

    assertThatThrownBy(() -> ScheduleGenerator.generate(inputFor(groups)))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("at least");
  }

  @Test
  void throwsWhenNoGroupsProvided() {
    var groups = new LinkedHashMap<GroupLabel, List<Team>>();

    assertThatThrownBy(() -> ScheduleGenerator.generate(inputFor(groups)))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("At least one group");
  }

  // Helpers -----------------------------------------------------------------

  private static void assertEachTeamPlays(
      List<MatchSpec> matches,
      Map<GroupLabel, List<Team>> groups,
      int expectedMatchesPerTeam) {
    var allIds = new HashSet<UUID>();
    groups.values().forEach(list -> list.forEach(t -> allIds.add(t.getId())));
    for (var id : allIds) {
      var count = matches.stream()
          .filter(m -> m.homeTeamId().equals(id) || m.awayTeamId().equals(id))
          .count();
      assertThat(count)
          .as("team %s plays %d matches", id, expectedMatchesPerTeam)
          .isEqualTo(expectedMatchesPerTeam);
    }
  }

  private static void assertEachPairPlaysOnceWithinGroup(
      List<MatchSpec> matches, Map<GroupLabel, List<Team>> groups) {
    groups.forEach((label, teams) -> {
      var seen = new HashSet<String>();
      var groupMatches = matches.stream()
          .filter(m -> m.groupLabel() == label)
          .toList();
      for (var m : groupMatches) {
        var key = pairKey(m.homeTeamId(), m.awayTeamId());
        assertThat(seen.add(key))
            .as("group %s pair %s plays only once", label, key)
            .isTrue();
      }
      var expectedPairs = teams.size() * (teams.size() - 1) / 2;
      assertThat(groupMatches).hasSize(expectedPairs);
    });
  }

  private static void assertGroupsAlternateBySlot(
      List<MatchSpec> matches, List<GroupLabel> expectedOrder) {
    var slotKeys = matches.stream()
        .map(MatchSpec::startTime)
        .distinct()
        .sorted()
        .toList();
    for (int i = 0; i < slotKeys.size(); i++) {
      var slot = slotKeys.get(i);
      var expected = expectedOrder.get(i % expectedOrder.size());
      var slotMatches = matches.stream()
          .filter(m -> m.startTime().equals(slot))
          .toList();
      assertThat(slotMatches)
          .as("slot %d is group %s", i, expected)
          .allMatch(m -> m.groupLabel() == expected);
    }
  }

  private static void assertPitchesAreContiguousFromOne(
      List<MatchSpec> matches, int expectedMaxPitch) {
    var slotKeys = matches.stream()
        .map(MatchSpec::startTime)
        .distinct()
        .toList();
    for (var slot : slotKeys) {
      var pitches = matches.stream()
          .filter(m -> m.startTime().equals(slot))
          .map(MatchSpec::pitch)
          .sorted()
          .toList();
      for (int i = 0; i < pitches.size(); i++) {
        assertThat(pitches.get(i))
            .as("slot %s pitch ordering", slot)
            .isEqualTo(i + 1);
      }
      assertThat(pitches.size()).isLessThanOrEqualTo(expectedMaxPitch);
    }
  }

  private static void assertSlotSpacingMatches(
      List<MatchSpec> matches, int durationMin, int breakMin) {
    var slots = matches.stream()
        .map(MatchSpec::startTime)
        .distinct()
        .sorted()
        .toList();
    var expectedMs = (long) (durationMin + breakMin) * 60_000L;
    for (int i = 1; i < slots.size(); i++) {
      var diff = slots.get(i).toEpochMilli() - slots.get(i - 1).toEpochMilli();
      assertThat(diff).isEqualTo(expectedMs);
    }
  }

  private static String pairKey(UUID a, UUID b) {
    return a.compareTo(b) < 0 ? a + "|" + b : b + "|" + a;
  }
}
