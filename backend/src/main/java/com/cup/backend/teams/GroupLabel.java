package com.cup.backend.teams;

/**
 * Group assignment for a team. Wire format is uppercase (matches the
 * frontend's literal {@code 'A' | 'B'} type) — Jackson handles enum names
 * uppercase by default, so no custom serializer is needed.
 */
public enum GroupLabel {
  A,
  B;
}
