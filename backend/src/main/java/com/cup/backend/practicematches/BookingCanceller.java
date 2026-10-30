package com.cup.backend.practicematches;

import com.fasterxml.jackson.annotation.JsonValue;

/** Who cancelled a booking. Stored uppercase in the DB; serialized lowercase in JSON. */
public enum BookingCanceller {
  BOOKER,
  ORGANIZER;

  @JsonValue
  public String toJson() {
    return name().toLowerCase();
  }
}
