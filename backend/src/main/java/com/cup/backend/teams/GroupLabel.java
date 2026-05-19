package com.cup.backend.teams;

/**
 * Group assignment for a team. Wire format is uppercase (matches the
 * frontend's literal {@code 'A' | 'B' | ... | 'H'} type) — Jackson handles
 * enum names uppercase by default, so no custom serializer is needed. The
 * cup decides how many of A–H are actually used via {@code numberOfGroups}.
 */
public enum GroupLabel {
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H;
}
