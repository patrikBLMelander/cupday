package com.cup.backend.teams;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Team / registration request and response payloads. */
public final class TeamDtos {

  private TeamDtos() {
    // Holder for record types.
  }

  public record RegistrationCreateRequest(
      @NotBlank String clubName,
      @NotBlank String contactName,
      @NotBlank @Email String contactEmail,
      @NotBlank String contactPhone,
      @NotEmpty @Size(min = 1, max = 2) List<@NotBlank String> teamNames) {}

  public record RegistrationCreateResponse(UUID registrationId, List<UUID> teamIds) {}

  public record PublicTeam(
      UUID id,
      String name,
      GroupLabel groupLabel,
      TeamStatus status) {

    public static PublicTeam from(Team team) {
      return new PublicTeam(team.getId(), team.getName(), team.getGroupLabel(), team.getStatus());
    }
  }

  public record RegistrationSummary(
      UUID id,
      UUID cupId,
      List<UUID> teamIds,
      Instant createdAt) {

    public static RegistrationSummary from(Registration registration, List<UUID> teamIds) {
      return new RegistrationSummary(
          registration.getId(),
          registration.getCupId(),
          teamIds,
          registration.getCreatedAt());
    }
  }

  public record RegistrationDetail(RegistrationSummary registration, List<PublicTeam> teams) {}

  /** Full team payload returned by admin endpoints (includes contact + timestamps). */
  public record AdminTeamResponse(
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
      Instant createdAt,
      Instant paidAt,
      Instant cancelledAt) {

    public static AdminTeamResponse from(Team team) {
      return new AdminTeamResponse(
          team.getId(),
          team.getCupId(),
          team.getRegistrationId(),
          team.getName(),
          team.getClubName(),
          team.getContactName(),
          team.getContactEmail(),
          team.getContactPhone(),
          team.getGroupLabel(),
          team.getStatus(),
          team.getCreatedAt(),
          team.getPaidAt(),
          team.getCancelledAt());
    }
  }

  // TeamUpdateRequest is consumed as a raw JsonNode in AdminTeamController so
  // the service can distinguish "field absent" (leave unchanged) from "field
  // null" (clear). Jackson collapses absent-vs-null when binding to records,
  // so a wrapper record won't carry the distinction we need.
}
