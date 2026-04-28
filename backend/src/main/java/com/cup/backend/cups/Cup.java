package com.cup.backend.cups;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Table(name = "cup")
@DynamicUpdate
public class Cup {

  @Id
  private UUID id;

  @Column(nullable = false, unique = true)
  private String slug;

  @Column(nullable = false)
  private String name;

  @Column(name = "organizing_club_name", nullable = false)
  private String organizingClubName;

  @Column(name = "primary_color_hsl", nullable = false)
  private String primaryColorHsl;

  @Column(name = "accent_color_hsl", nullable = false)
  private String accentColorHsl;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "end_date", nullable = false)
  private LocalDate endDate;

  @Column(name = "venue_name", nullable = false)
  private String venueName;

  @Column(name = "pitch_count", nullable = false)
  private int pitchCount;

  @Column(name = "max_teams", nullable = false)
  private int maxTeams;

  @Column(name = "registration_fee_sek", nullable = false)
  private int registrationFeeSek;

  @Column(name = "payment_instructions", nullable = false)
  private String paymentInstructions;

  @Column(name = "payment_lagkassan_link", nullable = false)
  private String paymentLagkassanLink;

  @Column(name = "payment_lagkassan_qr_url", nullable = false)
  private String paymentLagkassanQrUrl;

  @Column(name = "organizer_contact_name", nullable = false)
  private String organizerContactName;

  @Column(name = "organizer_contact_email", nullable = false)
  private String organizerContactEmail;

  @Column(name = "organizer_contact_phone", nullable = false)
  private String organizerContactPhone;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CupStatus status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Version
  private Long version;

  protected Cup() {
    // Required by JPA.
  }

  public Cup(
      UUID id,
      String slug,
      String name,
      String organizingClubName,
      String primaryColorHsl,
      String accentColorHsl,
      LocalDate startDate,
      LocalDate endDate,
      String venueName,
      int pitchCount,
      int maxTeams,
      int registrationFeeSek,
      String paymentInstructions,
      String paymentLagkassanLink,
      String paymentLagkassanQrUrl,
      String organizerContactName,
      String organizerContactEmail,
      String organizerContactPhone,
      CupStatus status,
      Instant createdAt) {
    this.id = id;
    this.slug = slug;
    this.name = name;
    this.organizingClubName = organizingClubName;
    this.primaryColorHsl = primaryColorHsl;
    this.accentColorHsl = accentColorHsl;
    this.startDate = startDate;
    this.endDate = endDate;
    this.venueName = venueName;
    this.pitchCount = pitchCount;
    this.maxTeams = maxTeams;
    this.registrationFeeSek = registrationFeeSek;
    this.paymentInstructions = paymentInstructions;
    this.paymentLagkassanLink = paymentLagkassanLink;
    this.paymentLagkassanQrUrl = paymentLagkassanQrUrl;
    this.organizerContactName = organizerContactName;
    this.organizerContactEmail = organizerContactEmail;
    this.organizerContactPhone = organizerContactPhone;
    this.status = status;
    this.createdAt = createdAt;
  }

  public UUID getId() { return id; }
  public String getSlug() { return slug; }
  public String getName() { return name; }
  public String getOrganizingClubName() { return organizingClubName; }
  public String getPrimaryColorHsl() { return primaryColorHsl; }
  public String getAccentColorHsl() { return accentColorHsl; }
  public LocalDate getStartDate() { return startDate; }
  public LocalDate getEndDate() { return endDate; }
  public String getVenueName() { return venueName; }
  public int getPitchCount() { return pitchCount; }
  public int getMaxTeams() { return maxTeams; }
  public int getRegistrationFeeSek() { return registrationFeeSek; }
  public String getPaymentInstructions() { return paymentInstructions; }
  public String getPaymentLagkassanLink() { return paymentLagkassanLink; }
  public String getPaymentLagkassanQrUrl() { return paymentLagkassanQrUrl; }
  public String getOrganizerContactName() { return organizerContactName; }
  public String getOrganizerContactEmail() { return organizerContactEmail; }
  public String getOrganizerContactPhone() { return organizerContactPhone; }
  public CupStatus getStatus() { return status; }
  public Instant getCreatedAt() { return createdAt; }
  public Long getVersion() { return version; }

  public void setSlug(String slug) { this.slug = slug; }
  public void setName(String name) { this.name = name; }
  public void setOrganizingClubName(String organizingClubName) { this.organizingClubName = organizingClubName; }
  public void setPrimaryColorHsl(String primaryColorHsl) { this.primaryColorHsl = primaryColorHsl; }
  public void setAccentColorHsl(String accentColorHsl) { this.accentColorHsl = accentColorHsl; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public void setVenueName(String venueName) { this.venueName = venueName; }
  public void setPitchCount(int pitchCount) { this.pitchCount = pitchCount; }
  public void setMaxTeams(int maxTeams) { this.maxTeams = maxTeams; }
  public void setRegistrationFeeSek(int registrationFeeSek) { this.registrationFeeSek = registrationFeeSek; }
  public void setPaymentInstructions(String paymentInstructions) { this.paymentInstructions = paymentInstructions; }
  public void setPaymentLagkassanLink(String paymentLagkassanLink) { this.paymentLagkassanLink = paymentLagkassanLink; }
  public void setPaymentLagkassanQrUrl(String paymentLagkassanQrUrl) { this.paymentLagkassanQrUrl = paymentLagkassanQrUrl; }
  public void setOrganizerContactName(String organizerContactName) { this.organizerContactName = organizerContactName; }
  public void setOrganizerContactEmail(String organizerContactEmail) { this.organizerContactEmail = organizerContactEmail; }
  public void setOrganizerContactPhone(String organizerContactPhone) { this.organizerContactPhone = organizerContactPhone; }
  public void setStatus(CupStatus status) { this.status = status; }
}
