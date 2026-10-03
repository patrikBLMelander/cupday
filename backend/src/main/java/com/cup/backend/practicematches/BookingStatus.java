package com.cup.backend.practicematches;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Booking lifecycle. Stored uppercase in the DB; serialized lowercase in JSON. */
public enum BookingStatus {
  BOOKED,
  CANCELLED;

  @JsonValue
  public String toJson() {
    return name().toLowerCase();
  }

  @JsonCreator
  public static BookingStatus fromJson(String value) {
    return BookingStatus.valueOf(value.toUpperCase());
  }
}
