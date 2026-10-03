package com.cup.backend.practicematches;

public class BookingTeamConflictException extends RuntimeException {

  private final String teamName;

  public BookingTeamConflictException(String teamName) {
    super("Team \"" + teamName + "\" has already booked this match");
    this.teamName = teamName;
  }

  public String getTeamName() {
    return teamName;
  }
}
