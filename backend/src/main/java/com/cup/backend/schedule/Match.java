package com.cup.backend.schedule;

import com.cup.backend.teams.GroupLabel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Table(name = "match")
@DynamicUpdate
public class Match {

  @Id
  private UUID id;

  @Column(name = "cup_id", nullable = false)
  private UUID cupId;

  @Enumerated(EnumType.STRING)
  @Column(name = "group_label", nullable = false)
  private GroupLabel groupLabel;

  @Column(nullable = false)
  private int pitch;

  @Column(name = "start_time", nullable = false)
  private Instant startTime;

  @Column(name = "home_team_id", nullable = false)
  private UUID homeTeamId;

  @Column(name = "away_team_id", nullable = false)
  private UUID awayTeamId;

  protected Match() {
    // Required by JPA.
  }

  public Match(
      UUID id,
      UUID cupId,
      GroupLabel groupLabel,
      int pitch,
      Instant startTime,
      UUID homeTeamId,
      UUID awayTeamId) {
    this.id = id;
    this.cupId = cupId;
    this.groupLabel = groupLabel;
    this.pitch = pitch;
    this.startTime = startTime;
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;
  }

  public UUID getId() { return id; }
  public UUID getCupId() { return cupId; }
  public GroupLabel getGroupLabel() { return groupLabel; }
  public int getPitch() { return pitch; }
  public Instant getStartTime() { return startTime; }
  public UUID getHomeTeamId() { return homeTeamId; }
  public UUID getAwayTeamId() { return awayTeamId; }

  public void setPitch(int pitch) { this.pitch = pitch; }
  public void setStartTime(Instant startTime) { this.startTime = startTime; }
}
