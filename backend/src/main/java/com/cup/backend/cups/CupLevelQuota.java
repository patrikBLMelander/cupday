package com.cup.backend.cups;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Optional locked number of team slots in a cup, per age class, per level, or per class + level
 * (e.g. P13 / Medel: 4). An empty string in {@code ageClass} or {@code level} means "any".
 */
@Entity
@Table(name = "cup_level_quota")
public class CupLevelQuota {

  @EmbeddedId
  private Key id;

  @Column(name = "max_teams", nullable = false)
  private int maxTeams;

  /** Display order as entered by the organizer. */
  @Column(nullable = false)
  private int position;

  protected CupLevelQuota() {
    // Required by JPA.
  }

  public CupLevelQuota(UUID cupId, String ageClass, String level, int maxTeams, int position) {
    this.id = new Key(cupId, ageClass, level);
    this.maxTeams = maxTeams;
    this.position = position;
  }

  public UUID getCupId() { return id.cupId; }
  public String getAgeClass() { return id.ageClass; }
  public String getLevel() { return id.level; }
  public int getMaxTeams() { return maxTeams; }
  public int getPosition() { return position; }

  /** Composite key (cup, age class, level). */
  @Embeddable
  public static class Key implements Serializable {

    @Column(name = "cup_id", nullable = false)
    private UUID cupId;

    @Column(name = "age_class", nullable = false)
    private String ageClass;

    @Column(nullable = false)
    private String level;

    protected Key() {
      // Required by JPA.
    }

    public Key(UUID cupId, String ageClass, String level) {
      this.cupId = cupId;
      this.ageClass = ageClass;
      this.level = level;
    }

    @Override
    public boolean equals(Object other) {
      return other instanceof Key key
          && key.cupId.equals(cupId) && key.ageClass.equals(ageClass) && key.level.equals(level);
    }

    @Override
    public int hashCode() {
      return Objects.hash(cupId, ageClass, level);
    }
  }
}
