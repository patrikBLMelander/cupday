package com.cup.backend.practicematches;

public class RateLimitedException extends RuntimeException {

  public RateLimitedException(String message) {
    super(message);
  }
}
