package com.cup.backend.cups;

public class CupNotFoundException extends RuntimeException {

  public CupNotFoundException(String message) {
    super(message);
  }
}
