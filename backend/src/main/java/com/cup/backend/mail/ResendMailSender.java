package com.cup.backend.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Sends through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
public class ResendMailSender implements MailSender {

  private static final Logger LOG = LoggerFactory.getLogger(ResendMailSender.class);
  private static final URI ENDPOINT = URI.create("https://api.resend.com/emails");
  private static final Duration TIMEOUT = Duration.ofSeconds(10);

  private final MailProperties properties;
  private final ObjectMapper objectMapper;
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();

  public ResendMailSender(MailProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  @Override
  public void send(MailMessage message) {
    try {
      var body = new LinkedHashMap<String, Object>();
      body.put("from", properties.from());
      body.put("to", List.of(message.to()));
      body.put("subject", message.subject());
      body.put("text", message.text());
      body.put("html", message.html());
      if (message.replyTo() != null && !message.replyTo().isBlank()) {
        body.put("reply_to", message.replyTo());
      }
      var request = HttpRequest.newBuilder(ENDPOINT)
          .timeout(TIMEOUT)
          .header("Authorization", "Bearer " + properties.resendApiKey())
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
          .build();
      var response = http.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 300) {
        LOG.warn("Resend rejected mail \"{}\": HTTP {} {}", message.subject(), response.statusCode(), response.body());
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      LOG.warn("Interrupted while sending mail \"{}\"", message.subject());
    } catch (Exception e) {
      LOG.warn("Could not send mail \"{}\": {}", message.subject(), e.toString());
    }
  }

  @Override
  public boolean enabled() {
    return true;
  }
}
