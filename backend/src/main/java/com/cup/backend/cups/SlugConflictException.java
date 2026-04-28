package com.cup.backend.cups;

public class SlugConflictException extends RuntimeException {

  private final String slug;

  public SlugConflictException(String slug) {
    super("A cup with slug \"" + slug + "\" already exists");
    this.slug = slug;
  }

  public String getSlug() {
    return slug;
  }
}
