package com.cup.backend.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Used when no API key is configured (local dev, tests): logs the mail instead of sending it. */
public class LoggingMailSender implements MailSender {

  private static final Logger LOG = LoggerFactory.getLogger(LoggingMailSender.class);

  @Override
  public void send(MailMessage message) {
    LOG.info("Mail not sent (no API key) to {}: {}\n{}", message.to(), message.subject(), message.text());
  }

  @Override
  public boolean enabled() {
    return false;
  }
}
