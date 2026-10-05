package com.cup.backend.mail;

/** One outgoing email. {@code replyTo} may be null. */
public record MailMessage(String to, String subject, String text, String html, String replyTo) {}
