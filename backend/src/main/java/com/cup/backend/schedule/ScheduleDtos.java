package com.cup.backend.schedule;

import com.cup.backend.teams.GroupLabel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

/** Schedule REST request and response payloads. */
public final class ScheduleDtos {

  private ScheduleDtos() {
    // Holder for record types.
  }

  public record MatchResponse(
      UUID id,
      UUID cupId,
      GroupLabel groupLabel,
      int pitch,
      Instant startTime,
      UUID homeTeamId,
      UUID awayTeamId) {

    public static MatchResponse from(Match match) {
      return new MatchResponse(
          match.getId(),
          match.getCupId(),
          match.getGroupLabel(),
          match.getPitch(),
          match.getStartTime(),
          match.getHomeTeamId(),
          match.getAwayTeamId());
    }
  }

  public record GenerateScheduleRequest(
      @NotNull Instant startTime,
      @Min(1) @Max(120) int matchDurationMinutes,
      @Min(0) @Max(60) int breakBetweenMatchesMinutes) {}

  public record MatchUpdateRequest(Instant startTime, Integer pitch) {}
}
