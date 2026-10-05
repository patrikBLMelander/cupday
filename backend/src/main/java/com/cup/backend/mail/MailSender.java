package com.cup.backend.mail;

/** Sends transactional email. Implementations must never throw for delivery problems — log instead. */
public interface MailSender {

  void send(MailMessage message);

  /** True when mail actually leaves the system (an API key is configured). */
  boolean enabled();
}
