package com.cup.backend.practicematches;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Practice-match lifecycle. Stored uppercase in the DB; serialized lowercase in JSON. */
public enum PracticeMatchStatus {
  ACTIVE,
  CANCELLED;

  @JsonValue
  public String toJson() {
    return name().toLowerCase();
  }

  @JsonCreator
  public static PracticeMatchStatus fromJson(String value) {
    return PracticeMatchStatus.valueOf(value.toUpperCase());
  }
}
