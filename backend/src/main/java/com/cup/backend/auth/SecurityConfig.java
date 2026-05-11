package com.cup.backend.auth;

import com.cup.backend.common.ProblemDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/** Stateless JWT-backed Spring Security wiring. */
@Configuration
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtFilter;
  private final ObjectMapper objectMapper;

  public SecurityConfig(JwtAuthenticationFilter jwtFilter, ObjectMapper objectMapper) {
    this.jwtFilter = jwtFilter;
    this.objectMapper = objectMapper;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .cors(Customizer.withDefaults())
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/logout").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
            .requestMatchers("/actuator/**").permitAll()
            .requestMatchers("/api/auth/me").authenticated()
            .requestMatchers("/api/admin/**").authenticated()
            .anyRequest().permitAll()
        )
        .exceptionHandling(ex -> ex
            .authenticationEntryPoint((request, response, authException) -> writeProblem(response))
            .accessDeniedHandler((request, response, accessDeniedException) -> writeProblem(response))
        )
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  private void writeProblem(jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
    var body = ProblemDetails.response(401, "Unauthorized", "Authentication required").getBody();
    response.setStatus(401);
    response.setContentType(ProblemDetails.MEDIA_TYPE.toString());
    objectMapper.writeValue(response.getOutputStream(), body);
  }
}
