package com.cup.backend.practicematches;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicUpdate;

/** One opponent slot taken in a practice match. */
@Entity
@Table(name = "practice_match_booking")
@DynamicUpdate
public class PracticeMatchBooking {

  @Id
  private UUID id;

  @Column(name = "match_id", nullable = false, updatable = false)
  private UUID matchId;

  @Column(name = "team_name", nullable = false)
  private String teamName;

  @Column(name = "contact_name", nullable = false)
  private String contactName;

  @Column(name = "contact_phone", nullable = false)
  private String contactPhone;

  @Column(name = "contact_email", nullable = false)
  private String contactEmail;

  /** Optional message to the organizer. */
  @Column
  private String message;

  @Column(name = "manage_token_hash", nullable = false, updatable = false)
  private String manageTokenHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private BookingStatus status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "cancelled_at")
  private Instant cancelledAt;

  protected PracticeMatchBooking() {
    // Required by JPA.
  }

  public PracticeMatchBooking(
      UUID id,
      UUID matchId,
      String teamName,
      String contactName,
      String contactPhone,
      String contactEmail,
      String message,
      String manageTokenHash,
      Instant createdAt) {
    this.id = id;
    this.matchId = matchId;
    this.teamName = teamName;
    this.contactName = contactName;
    this.contactPhone = contactPhone;
    this.contactEmail = contactEmail;
    this.message = message;
    this.manageTokenHash = manageTokenHash;
    this.status = BookingStatus.BOOKED;
    this.createdAt = createdAt;
  }

  public UUID getId() { return id; }
  public UUID getMatchId() { return matchId; }
  public String getTeamName() { return teamName; }
  public String getContactName() { return contactName; }
  public String getContactPhone() { return contactPhone; }
  public String getContactEmail() { return contactEmail; }
  public String getMessage() { return message; }
  public String getManageTokenHash() { return manageTokenHash; }
  public BookingStatus getStatus() { return status; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getCancelledAt() { return cancelledAt; }

  public void setStatus(BookingStatus status) { this.status = status; }
  public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }
}
