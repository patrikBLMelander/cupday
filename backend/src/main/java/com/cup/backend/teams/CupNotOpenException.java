package com.cup.backend.teams;

public class CupNotOpenException extends RuntimeException {

  public CupNotOpenException(String message) {
    super(message);
  }
}
