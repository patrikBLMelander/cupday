package com.cup.backend.cups;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Cup REST request and response payloads. */
public final class CupDtos {

  private CupDtos() {
    // Holder for record types.
  }

  public record CupColors(
      @NotBlank String primary,
      @NotBlank String accent) {}

  public record CupResponse(
      UUID id,
      String slug,
      String name,
      String organizingClubName,
      CupColors organizingClubColors,
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

    public static CupResponse from(Cup cup) {
      return new CupResponse(
          cup.getId(),
          cup.getSlug(),
          cup.getName(),
          cup.getOrganizingClubName(),
          new CupColors(cup.getPrimaryColorHsl(), cup.getAccentColorHsl()),
          cup.getStartDate(),
          cup.getEndDate(),
          cup.getVenueName(),
          cup.getPitchCount(),
          cup.getMaxTeams(),
          cup.getRegistrationFeeSek(),
          cup.getPaymentInstructions(),
          cup.getPaymentLagkassanLink(),
          cup.getPaymentLagkassanQrUrl(),
          cup.getOrganizerContactName(),
          cup.getOrganizerContactEmail(),
          cup.getOrganizerContactPhone(),
          cup.getStatus(),
          cup.getCreatedAt());
    }
  }

  public record CupCreateRequest(
      @NotBlank @Pattern(regexp = "^[a-z0-9-]+$") String slug,
      @NotBlank String name,
      @NotBlank String organizingClubName,
      @NotNull @Valid CupColors organizingClubColors,
      @NotNull LocalDate startDate,
      @NotNull LocalDate endDate,
      @NotBlank String venueName,
      @Min(1) int pitchCount,
      @Min(2) int maxTeams,
      @Min(0) int registrationFeeSek,
      String paymentInstructions,
      String paymentLagkassanLink,
      String paymentLagkassanQrUrl,
      @NotBlank String organizerContactName,
      @NotBlank @Email String organizerContactEmail,
      @NotBlank String organizerContactPhone) {}

  /** Partial update — null means "leave unchanged". */
  public record CupUpdateRequest(
      String slug,
      String name,
      String organizingClubName,
      CupColors organizingClubColors,
      LocalDate startDate,
      LocalDate endDate,
      String venueName,
      Integer pitchCount,
      Integer maxTeams,
      Integer registrationFeeSek,
      String paymentInstructions,
      String paymentLagkassanLink,
      String paymentLagkassanQrUrl,
      String organizerContactName,
      String organizerContactEmail,
      String organizerContactPhone,
      CupStatus status) {}
}
