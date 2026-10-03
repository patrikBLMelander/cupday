package com.cup.backend.practicematches;

public class BookingNotFoundException extends RuntimeException {

  public BookingNotFoundException(String message) {
    super(message);
  }
}
