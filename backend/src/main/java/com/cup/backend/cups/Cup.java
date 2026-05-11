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

  @Column(name = "players_per_team", nullable = false)
  private int playersPerTeam;

  @Column(name = "club_logo_url", nullable = false)
  private String clubLogoUrl;

  @Column(name = "use_levels", nullable = false)
  private boolean useLevels;

  /** Comma-separated level names; empty when {@link #useLevels} is false. */
  @Column(nullable = false)
  private String levels;

  @Column(name = "has_toilets", nullable = false)
  private boolean hasToilets;

  @Column(name = "has_food", nullable = false)
  private boolean hasFood;

  @Column(name = "has_parking", nullable = false)
  private boolean hasParking;

  @Column(name = "map_url", nullable = false)
  private String mapUrl;

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
    // Delegate with sensible defaults for the BE-07 fields. Tests and other
    // callers that don't yet pass the new fields stay valid; the 24-arg
    // constructor (below) is the canonical one going forward.
    this(id, slug, name, organizingClubName, primaryColorHsl, accentColorHsl,
        startDate, endDate, venueName, pitchCount, maxTeams, registrationFeeSek,
        paymentInstructions, paymentLagkassanLink, paymentLagkassanQrUrl,
        organizerContactName, organizerContactEmail, organizerContactPhone,
        status, createdAt,
        7, "", false, "");
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
      Instant createdAt,
      int playersPerTeam,
      String clubLogoUrl,
      boolean useLevels,
      String levels) {
    this(id, slug, name, organizingClubName, primaryColorHsl, accentColorHsl,
        startDate, endDate, venueName, pitchCount, maxTeams, registrationFeeSek,
        paymentInstructions, paymentLagkassanLink, paymentLagkassanQrUrl,
        organizerContactName, organizerContactEmail, organizerContactPhone,
        status, createdAt, playersPerTeam, clubLogoUrl, useLevels, levels,
        false, false, false, "");
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
      Instant createdAt,
      int playersPerTeam,
      String clubLogoUrl,
      boolean useLevels,
      String levels,
      boolean hasToilets,
      boolean hasFood,
      boolean hasParking,
      String mapUrl) {
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
    this.playersPerTeam = playersPerTeam;
    this.clubLogoUrl = clubLogoUrl;
    this.useLevels = useLevels;
    this.levels = levels;
    this.hasToilets = hasToilets;
    this.hasFood = hasFood;
    this.hasParking = hasParking;
    this.mapUrl = mapUrl;
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
  public int getPlayersPerTeam() { return playersPerTeam; }
  public String getClubLogoUrl() { return clubLogoUrl; }
  public boolean isUseLevels() { return useLevels; }
  public String getLevels() { return levels; }
  public boolean isHasToilets() { return hasToilets; }
  public boolean isHasFood() { return hasFood; }
  public boolean isHasParking() { return hasParking; }
  public String getMapUrl() { return mapUrl; }

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
  public void setPlayersPerTeam(int playersPerTeam) { this.playersPerTeam = playersPerTeam; }
  public void setClubLogoUrl(String clubLogoUrl) { this.clubLogoUrl = clubLogoUrl; }
  public void setUseLevels(boolean useLevels) { this.useLevels = useLevels; }
  public void setLevels(String levels) { this.levels = levels; }
  public void setHasToilets(boolean hasToilets) { this.hasToilets = hasToilets; }
  public void setHasFood(boolean hasFood) { this.hasFood = hasFood; }
  public void setHasParking(boolean hasParking) { this.hasParking = hasParking; }
  public void setMapUrl(String mapUrl) { this.mapUrl = mapUrl; }
}
