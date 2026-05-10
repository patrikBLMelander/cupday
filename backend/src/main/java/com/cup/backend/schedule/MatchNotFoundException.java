package com.cup.backend.schedule;

public class MatchNotFoundException extends RuntimeException {

  public MatchNotFoundException(String message) {
    super(message);
  }
}
