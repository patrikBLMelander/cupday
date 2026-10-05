package com.cup.backend.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Mail settings, bound from {@code cup.mail.*}. Without an API key mail is only logged. */
@ConfigurationProperties(prefix = "cup.mail")
public record MailProperties(String resendApiKey, String from) {

  public boolean hasApiKey() {
    return resendApiKey != null && !resendApiKey.isBlank();
  }
}
