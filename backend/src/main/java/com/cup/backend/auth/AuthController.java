package com.cup.backend.auth;

import com.cup.backend.auth.AuthDtos.LoginRequest;
import com.cup.backend.auth.AuthDtos.MeResponse;
import com.cup.backend.auth.AuthDtos.UserDto;
import com.cup.backend.common.ProblemDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request)
        .<ResponseEntity<?>>map(ResponseEntity::ok)
        .orElseGet(() -> ProblemDetails.response(
            401, "Invalid credentials", "Email or password is invalid"));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout() {
    return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
  }

  @GetMapping("/me")
  public ResponseEntity<MeResponse> me(@AuthenticationPrincipal User user) {
    return ResponseEntity.ok(new MeResponse(UserDto.from(user)));
  }
}
