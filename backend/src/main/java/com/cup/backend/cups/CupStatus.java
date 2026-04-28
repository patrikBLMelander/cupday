package com.cup.backend.cups;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Cup lifecycle status. Stored uppercase in the DB via JPA; serialized
 * lowercase in JSON to match the frontend's wire format.
 */
public enum CupStatus {
  DRAFT,
  OPEN,
  FULL,
  SCHEDULED,
  FINISHED;

  @JsonValue
  public String toJson() {
    return name().toLowerCase();
  }

  @JsonCreator
  public static CupStatus fromJson(String value) {
    return CupStatus.valueOf(value.toUpperCase());
  }
}
