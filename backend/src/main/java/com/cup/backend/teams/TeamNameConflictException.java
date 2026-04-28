package com.cup.backend.teams;

public class TeamNameConflictException extends RuntimeException {

  private final String teamName;

  public TeamNameConflictException(String teamName) {
    super("The name \"" + teamName
        + "\" is already taken — add a number or color to keep teams apart");
    this.teamName = teamName;
  }

  public String getTeamName() {
    return teamName;
  }
}
