package com.cup.backend.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Picks the mail sender and enables async delivery so requests never wait on the mail API. */
@Configuration
@EnableAsync
public class MailConfig {

  @Bean
  public MailSender mailSender(MailProperties properties, ObjectMapper objectMapper) {
    return properties.hasApiKey() ? new ResendMailSender(properties, objectMapper) : new LoggingMailSender();
  }
}
