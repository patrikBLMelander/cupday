package com.cup.backend.teams;

public class InvalidTeamTransitionException extends RuntimeException {

  public InvalidTeamTransitionException(String message) {
    super(message);
  }
}
