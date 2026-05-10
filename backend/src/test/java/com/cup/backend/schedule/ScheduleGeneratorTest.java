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
import java.util.List;
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

  private static GenerationInput input() {
    return new GenerationInput(
        CUP_ID,
        List.of(team("A1"), team("A2"), team("A3"), team("A4")),
        List.of(team("B1"), team("B2"), team("B3"), team("B4")),
        START,
        15,
        5);
  }

  @Test
  void produces12MatchesWithExpectedRoundRobinPairings() {
    var input = input();
    var matches = ScheduleGenerator.generate(input);

    assertThat(matches).hasSize(12);

    // Slot 0 (Group A R1): pitch 1 = (A1, A2), pitch 2 = (A3, A4)
    var s0p1 = matches.get(0);
    var s0p2 = matches.get(1);
    assertThat(s0p1.groupLabel()).isEqualTo(GroupLabel.A);
    assertThat(s0p1.pitch()).isEqualTo(1);
    assertThat(s0p1.homeTeamId()).isEqualTo(input.groupATeams().get(0).getId());
    assertThat(s0p1.awayTeamId()).isEqualTo(input.groupATeams().get(1).getId());
    assertThat(s0p2.pitch()).isEqualTo(2);
    assertThat(s0p2.homeTeamId()).isEqualTo(input.groupATeams().get(2).getId());
    assertThat(s0p2.awayTeamId()).isEqualTo(input.groupATeams().get(3).getId());

    // Slot 1 (Group B R1): pitch 1 = (B1, B2), pitch 2 = (B3, B4)
    var s1p1 = matches.get(2);
    assertThat(s1p1.groupLabel()).isEqualTo(GroupLabel.B);
    assertThat(s1p1.pitch()).isEqualTo(1);
    assertThat(s1p1.homeTeamId()).isEqualTo(input.groupBTeams().get(0).getId());
    assertThat(s1p1.awayTeamId()).isEqualTo(input.groupBTeams().get(1).getId());

    // Slot 4 (Group A R3): pitch 1 = (A1, A4), pitch 2 = (A2, A3)
    var s4p1 = matches.get(8);
    var s4p2 = matches.get(9);
    assertThat(s4p1.homeTeamId()).isEqualTo(input.groupATeams().get(0).getId());
    assertThat(s4p1.awayTeamId()).isEqualTo(input.groupATeams().get(3).getId());
    assertThat(s4p2.homeTeamId()).isEqualTo(input.groupATeams().get(1).getId());
    assertThat(s4p2.awayTeamId()).isEqualTo(input.groupATeams().get(2).getId());
  }

  @Test
  void everyTeamPlaysExactlyThreeMatches() {
    var input = input();
    var matches = ScheduleGenerator.generate(input);
    var allIds = new HashSet<UUID>();
    input.groupATeams().forEach(t -> allIds.add(t.getId()));
    input.groupBTeams().forEach(t -> allIds.add(t.getId()));

    for (var id : allIds) {
      var count = matches.stream()
          .filter(m -> m.homeTeamId().equals(id) || m.awayTeamId().equals(id))
          .count();
      assertThat(count).as("team %s plays 3 matches", id).isEqualTo(3);
    }
  }

  @Test
  void evenSlotsAreGroupAOnlyAndOddSlotsAreGroupBOnly() {
    var matches = ScheduleGenerator.generate(input());
    var slotKeys = matches.stream()
        .map(MatchSpec::startTime)
        .distinct()
        .sorted()
        .toList();
    assertThat(slotKeys).hasSize(6);

    for (int i = 0; i < slotKeys.size(); i++) {
      var slot = slotKeys.get(i);
      var slotMatches = matches.stream()
          .filter(m -> m.startTime().equals(slot))
          .toList();
      var expected = (i % 2 == 0) ? GroupLabel.A : GroupLabel.B;
      assertThat(slotMatches)
          .as("slot %d", i)
          .allMatch(m -> m.groupLabel() == expected);
    }
  }

  @Test
  void slotTimestampsAreSpacedByDurationPlusBreak() {
    var matches = ScheduleGenerator.generate(input());
    var slots = matches.stream()
        .map(MatchSpec::startTime)
        .distinct()
        .sorted()
        .toList();
    var expectedMs = (15L + 5L) * 60_000L;
    for (int i = 1; i < slots.size(); i++) {
      var diff = slots.get(i).toEpochMilli() - slots.get(i - 1).toEpochMilli();
      assertThat(diff).isEqualTo(expectedMs);
    }
  }

  @Test
  void throwsWhenAGroupDoesNotHaveExactlyFourTeams() {
    var bad = new GenerationInput(
        CUP_ID,
        List.of(team("A1"), team("A2"), team("A3")),
        List.of(team("B1"), team("B2"), team("B3"), team("B4")),
        START,
        15,
        5);
    assertThatThrownBy(() -> ScheduleGenerator.generate(bad))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
