package com.cup.backend.auth;

import com.cup.backend.auth.AuthDtos.LoginRequest;
import com.cup.backend.auth.AuthDtos.LoginResponse;
import com.cup.backend.auth.AuthDtos.UserDto;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/** Login flow + token issuance. */
@Service
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  /** Returns a signed JWT + user payload, or empty on bad credentials. */
  public Optional<LoginResponse> login(LoginRequest request) {
    return userRepository.findByEmailIgnoreCase(request.email())
        .filter(user -> passwordEncoder.matches(request.password(), user.getPasswordHash()))
        .map(user -> new LoginResponse(jwtService.issue(user), UserDto.from(user)));
  }
}
