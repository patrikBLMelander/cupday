package com.cup.backend.schedule;

import com.cup.backend.cups.CupNotFoundException;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.cups.CupStatus;
import com.cup.backend.schedule.ScheduleDtos.GenerateScheduleRequest;
import com.cup.backend.schedule.ScheduleDtos.MatchUpdateRequest;
import com.cup.backend.schedule.ScheduleGenerator.GenerationInput;
import com.cup.backend.teams.GroupLabel;
import com.cup.backend.teams.Team;
import com.cup.backend.teams.TeamRepository;
import com.cup.backend.teams.TeamStatus;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Schedule generation + per-match updates. */
@Service
public class ScheduleService {

  private static final int PITCH_1 = 1;
  private static final int PITCH_2 = 2;

  private final CupRepository cupRepository;
  private final TeamRepository teamRepository;
  private final MatchRepository matchRepository;

  public ScheduleService(
      CupRepository cupRepository,
      TeamRepository teamRepository,
      MatchRepository matchRepository) {
    this.cupRepository = cupRepository;
    this.teamRepository = teamRepository;
    this.matchRepository = matchRepository;
  }

  @Transactional(readOnly = true)
  public List<Match> listByCup(UUID cupId) {
    if (!cupRepository.existsById(cupId)) {
      throw new CupNotFoundException("Cup " + cupId + " not found");
    }
    return matchRepository.findByCupIdOrderByStartTimeAsc(cupId);
  }

  @Transactional
  public List<Match> generate(UUID cupId, GenerateScheduleRequest request) {
    var cup = cupRepository.findByIdForUpdate(cupId)
        .orElseThrow(() -> new CupNotFoundException("Cup " + cupId + " not found"));

    if (cup.getStatus() == CupStatus.DRAFT) {
      throw new CupNotReadyException("Open registrations before generating a schedule");
    }

    var teamsPerGroup = cup.getTeamsPerGroup();
    var groupLabels = Arrays.stream(GroupLabel.values())
        .limit(cup.getNumberOfGroups())
        .toList();

    var teamsByGroup = new LinkedHashMap<GroupLabel, List<Team>>();
    var counts = new ArrayList<String>(groupLabels.size());
    var allOk = true;
    for (var label : groupLabels) {
      var teams = teamRepository.findByCupIdAndStatusAndGroupLabelOrderByCreatedAtAsc(
          cupId, TeamStatus.PAID, label);
      teamsByGroup.put(label, teams);
      counts.add(label.name() + "=" + teams.size());
      if (teams.size() != teamsPerGroup) {
        allOk = false;
      }
    }
    if (!allOk) {
      throw new InsufficientPaidTeamsException(
          "Need " + teamsPerGroup + " paid teams in each group ("
              + String.join(", ", counts) + ")");
    }

    var specs = ScheduleGenerator.generate(new GenerationInput(
        cupId,
        teamsByGroup,
        request.startTime(),
        request.matchDurationMinutes(),
        request.breakBetweenMatchesMinutes()));

    matchRepository.deleteByCupId(cupId);
    matchRepository.flush();
    var newMatches = specs.stream()
        .map(spec -> new Match(
            UUID.randomUUID(),
            spec.cupId(),
            spec.groupLabel(),
            spec.pitch(),
            spec.startTime(),
            spec.homeTeamId(),
            spec.awayTeamId()))
        .toList();
    matchRepository.saveAll(newMatches);

    if (cup.getStatus() == CupStatus.OPEN || cup.getStatus() == CupStatus.FULL) {
      cup.setStatus(CupStatus.SCHEDULED);
    }

    return matchRepository.findByCupIdOrderByStartTimeAsc(cupId);
  }

  @Transactional
  public Match updateMatch(UUID matchId, MatchUpdateRequest request) {
    var match = matchRepository.findById(matchId)
        .orElseThrow(() -> new MatchNotFoundException("Match " + matchId + " not found"));

    if (request.startTime() != null) {
      match.setStartTime(request.startTime());
    }
    if (request.pitch() != null) {
      var pitch = request.pitch();
      if (pitch != PITCH_1 && pitch != PITCH_2) {
        throw new IllegalArgumentException("pitch must be 1 or 2");
      }
      match.setPitch(pitch);
    }
    return match;
  }
}
