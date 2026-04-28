package com.cup.backend.teams;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Team lifecycle status. Stored uppercase in the DB via JPA; serialized
 * lowercase in JSON to match the frontend wire format.
 */
public enum TeamStatus {
  RESERVED,
  PAID,
  CANCELLED;

  @JsonValue
  public String toJson() {
    return name().toLowerCase();
  }

  @JsonCreator
  public static TeamStatus fromJson(String value) {
    return TeamStatus.valueOf(value.toUpperCase());
  }
}
