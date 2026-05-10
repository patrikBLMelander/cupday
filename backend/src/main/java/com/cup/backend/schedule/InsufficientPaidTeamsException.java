package com.cup.backend.schedule;

public class InsufficientPaidTeamsException extends RuntimeException {

  public InsufficientPaidTeamsException(String message) {
    super(message);
  }
}
