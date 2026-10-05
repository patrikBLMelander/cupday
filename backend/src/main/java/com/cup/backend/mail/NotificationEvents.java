package com.cup.backend.mail;

import java.util.List;
import java.util.UUID;

/**
 * Domain events that trigger email. They carry ids plus the one-time raw tokens (never stored),
 * and are handled after the transaction commits.
 */
public final class NotificationEvents {

  private NotificationEvents() {
    // Holder for record types.
  }

  public record PracticeMatchPosted(UUID matchId, String manageToken) {}

  public record PracticeMatchBooked(UUID matchId, UUID bookingId, String bookingToken) {}

  public record CupPosted(UUID cupId, String manageToken) {}

  public record CupTeamsRegistered(UUID cupId, List<UUID> teamIds) {}
}
