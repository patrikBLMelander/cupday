package com.cup.backend.teams;

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
@Table(name = "team")
@DynamicUpdate
public class Team {

  @Id
  private UUID id;

  @Column(name = "cup_id", nullable = false)
  private UUID cupId;

  @Column(name = "registration_id", nullable = false)
  private UUID registrationId;

  @Column(nullable = false)
  private String name;

  @Column(name = "club_name", nullable = false)
  private String clubName;

  @Column(name = "contact_name", nullable = false)
  private String contactName;

  @Column(name = "contact_email", nullable = false)
  private String contactEmail;

  @Column(name = "contact_phone", nullable = false)
  private String contactPhone;

  @Enumerated(EnumType.STRING)
  @Column(name = "group_label")
  private GroupLabel groupLabel;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TeamStatus status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "paid_at")
  private Instant paidAt;

  @Column(name = "cancelled_at")
  private Instant cancelledAt;

  protected Team() {
    // Required by JPA.
  }

  public Team(
      UUID id,
      UUID cupId,
      UUID registrationId,
      String name,
      String clubName,
      String contactName,
      String contactEmail,
      String contactPhone,
      GroupLabel groupLabel,
      TeamStatus status,
      Instant createdAt) {
    this.id = id;
    this.cupId = cupId;
    this.registrationId = registrationId;
    this.name = name;
    this.clubName = clubName;
    this.contactName = contactName;
    this.contactEmail = contactEmail;
    this.contactPhone = contactPhone;
    this.groupLabel = groupLabel;
    this.status = status;
    this.createdAt = createdAt;
  }

  public UUID getId() { return id; }
  public UUID getCupId() { return cupId; }
  public UUID getRegistrationId() { return registrationId; }
  public String getName() { return name; }
  public String getClubName() { return clubName; }
  public String getContactName() { return contactName; }
  public String getContactEmail() { return contactEmail; }
  public String getContactPhone() { return contactPhone; }
  public GroupLabel getGroupLabel() { return groupLabel; }
  public TeamStatus getStatus() { return status; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getPaidAt() { return paidAt; }
  public Instant getCancelledAt() { return cancelledAt; }

  public void setGroupLabel(GroupLabel groupLabel) { this.groupLabel = groupLabel; }
  public void setStatus(TeamStatus status) { this.status = status; }
  public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
  public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }
}
