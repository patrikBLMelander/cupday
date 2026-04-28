package com.cup.backend.auth;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

/** Auth request and response payloads. Records are immutable by default. */
public final class AuthDtos {

  private AuthDtos() {
    // Holder for record types.
  }

  public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

  public record LoginResponse(String token, UserDto user) {}

  public record MeResponse(UserDto user) {}

  public record UserDto(UUID id, String email) {

    public static UserDto from(User user) {
      return new UserDto(user.getId(), user.getEmail());
    }
  }
}
