package com.cup.backend.practicematches;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicUpdate;

/** A practice match posted on the public board, looking for opponents. */
@Entity
@Table(name = "practice_match")
@DynamicUpdate
public class PracticeMatch {

  @Id
  private UUID id;

  @Column(name = "team_name", nullable = false)
  private String teamName;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Gender gender;

  @Column(name = "birth_year", nullable = false)
  private int birthYear;

  /** 1 = Lätt− … 9 = Svår+. */
  @Column(nullable = false)
  private short level;

  @Column(name = "players_per_side", nullable = false)
  private int playersPerSide;

  @Column(name = "kickoff_at", nullable = false)
  private Instant kickoffAt;

  @Column(name = "ends_at", nullable = false)
  private Instant endsAt;

  @Column(nullable = false)
  private String venue;

  @Column(name = "opponent_slots", nullable = false)
  private int opponentSlots;

  @Column(name = "contact_name", nullable = false)
  private String contactName;

  @Column(name = "contact_phone", nullable = false)
  private String contactPhone;

  @Column(name = "contact_email", nullable = false)
  private String contactEmail;

  /** Optional cost per team in SEK; null when not stated. */
  @Column(name = "cost_sek")
  private Integer costSek;

  /** Optional free-text info. */
  @Column
  private String notes;

  @Column(name = "manage_token_hash", nullable = false, updatable = false)
  private String manageTokenHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PracticeMatchStatus status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "cancelled_at")
  private Instant cancelledAt;

  @Version
  private Long version;

  protected PracticeMatch() {
    // Required by JPA.
  }

  public PracticeMatch(UUID id, String manageTokenHash, Instant createdAt) {
    this.id = id;
    this.manageTokenHash = manageTokenHash;
    this.createdAt = createdAt;
    this.status = PracticeMatchStatus.ACTIVE;
  }

  public UUID getId() { return id; }
  public String getTeamName() { return teamName; }
  public Gender getGender() { return gender; }
  public int getBirthYear() { return birthYear; }
  public int getLevel() { return level; }
  public int getPlayersPerSide() { return playersPerSide; }
  public Instant getKickoffAt() { return kickoffAt; }
  public Instant getEndsAt() { return endsAt; }
  public String getVenue() { return venue; }
  public int getOpponentSlots() { return opponentSlots; }
  public String getContactName() { return contactName; }
  public String getContactPhone() { return contactPhone; }
  public String getContactEmail() { return contactEmail; }
  public Integer getCostSek() { return costSek; }
  public String getNotes() { return notes; }
  public String getManageTokenHash() { return manageTokenHash; }
  public PracticeMatchStatus getStatus() { return status; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getCancelledAt() { return cancelledAt; }
  public Long getVersion() { return version; }

  public void setTeamName(String teamName) { this.teamName = teamName; }
  public void setGender(Gender gender) { this.gender = gender; }
  public void setBirthYear(int birthYear) { this.birthYear = birthYear; }
  public void setLevel(int level) { this.level = (short) level; }
  public void setPlayersPerSide(int playersPerSide) { this.playersPerSide = playersPerSide; }
  public void setKickoffAt(Instant kickoffAt) { this.kickoffAt = kickoffAt; }
  public void setEndsAt(Instant endsAt) { this.endsAt = endsAt; }
  public void setVenue(String venue) { this.venue = venue; }
  public void setOpponentSlots(int opponentSlots) { this.opponentSlots = opponentSlots; }
  public void setContactName(String contactName) { this.contactName = contactName; }
  public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
  public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
  public void setCostSek(Integer costSek) { this.costSek = costSek; }
  public void setNotes(String notes) { this.notes = notes; }
  public void setStatus(PracticeMatchStatus status) { this.status = status; }
  public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }
}
