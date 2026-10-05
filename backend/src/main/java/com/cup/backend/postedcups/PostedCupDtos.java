package com.cup.backend.postedcups;

import com.cup.backend.cups.CupDtos.CupResponse;
import com.cup.backend.teams.TeamDtos.AdminTeamResponse;
import com.cup.backend.teams.TeamStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Payloads for cups posted and managed without an account. */
public final class PostedCupDtos {

  private static final int MAX_TEXT = 200;
  private static final int MAX_URL = 500;
  private static final int MAX_LONG_TEXT = 4000;

  private PostedCupDtos() {
    // Holder for record types.
  }

  /**
   * Create/update body. Optional: club logo, registration deadline, external registration URL,
   * payment link/instructions, slot quotas, description, amenities and map link.
   * {@code website} is a honeypot.
   */
  public record PostedCupRequest(
      @NotBlank @Size(max = MAX_TEXT) String name,
      @NotBlank @Size(max = MAX_TEXT) String organizingClubName,
      @Size(max = MAX_URL) String clubLogoUrl,
      @NotNull @FutureOrPresent LocalDate startDate,
      @NotNull LocalDate endDate,
      @NotNull LocalTime startTime,
      @NotNull LocalTime endTime,
      @NotBlank @Size(max = MAX_TEXT) String venueName,
      @NotEmpty @Size(max = 10) List<@NotBlank @Size(max = 20) String> ageClasses,
      @NotNull Integer playersPerTeam,
      @NotNull @Min(1) @Max(9) Integer levelMin,
      @NotNull @Min(1) @Max(9) Integer levelMax,
      @NotNull @Min(2) @Max(200) Integer maxTeams,
      @NotNull @PositiveOrZero Integer registrationFeeSek,
      LocalDate registrationDeadline,
      @Size(max = MAX_URL) String externalRegistrationUrl,
      @Size(max = MAX_URL) String paymentLink,
      @Size(max = MAX_LONG_TEXT) String paymentInstructions,
      @Valid @Size(max = 90) List<SlotRequest> slots,
      @NotBlank @Size(max = MAX_TEXT) String contactName,
      @NotBlank @Size(max = MAX_TEXT) String contactPhone,
      @NotBlank @Email @Size(max = MAX_TEXT) String contactEmail,
      @Size(max = MAX_LONG_TEXT) String description,
      Boolean hasToilets,
      Boolean hasFood,
      Boolean hasParking,
      @Size(max = MAX_URL) String mapUrl,
      @NotNull @AssertTrue Boolean acceptTerms,
      String website) {}

  /**
   * Locked slots for an age class and/or level. Several classes require one row per class (or per
   * class + level when levels are locked); a single class may lock levels with {@code ageClass} empty.
   */
  public record SlotRequest(@Size(max = 20) String ageClass, @Size(max = 40) String level, @NotNull @Min(1) Integer maxTeams) {}

  /** Returned once on create; the raw token is never stored or shown again. */
  /** {@code confirmationEmail}: the admin link is also on its way to the organizer by email. */
  public record CreatePostedCupResponse(CupResponse cup, String manageToken, boolean confirmationEmail) {}

  /** Organizer view: the cup plus every team with contact details and payment status. */
  public record ManagedCupResponse(CupResponse cup, List<AdminTeamResponse> teams) {}

  public record TeamStatusRequest(@NotNull TeamStatus status) {}
}
