package com.cup.backend.schedule;

public class CupNotReadyException extends RuntimeException {

  public CupNotReadyException(String message) {
    super(message);
  }
}
