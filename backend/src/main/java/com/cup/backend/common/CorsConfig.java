package com.cup.backend.common;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS for the SPA frontend. Default allows the Vite dev origin so a local
 * {@code npm run dev} can talk to the dockerised backend on localhost:8080.
 * Override via {@code CUP_CORS_ALLOWED_ORIGINS} (comma-separated) when
 * deploying.
 */
@Configuration
public class CorsConfig {

  private static final String DEFAULT_DEV_ORIGIN = "http://localhost:5173";

  private final String allowedOrigins;

  public CorsConfig(
      @Value("${cup.cors.allowed-origins:" + DEFAULT_DEV_ORIGIN + "}") String allowedOrigins) {
    this.allowedOrigins = allowedOrigins;
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    var config = new CorsConfiguration();
    config.setAllowedOrigins(Arrays.asList(allowedOrigins.split("\\s*,\\s*")));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setExposedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(false);
    config.setMaxAge(3600L);
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
  }
}
