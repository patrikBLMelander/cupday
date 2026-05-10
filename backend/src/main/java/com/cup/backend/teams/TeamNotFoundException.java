package com.cup.backend.teams;

public class TeamNotFoundException extends RuntimeException {

  public TeamNotFoundException(String message) {
    super(message);
  }
}
