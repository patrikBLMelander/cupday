package com.cup.backend.practicematches;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PracticeMatchRepository extends JpaRepository<PracticeMatch, UUID> {

  /** Pessimistic write lock on the match row — serializes bookings on the same match. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT m FROM PracticeMatch m WHERE m.id = :id")
  Optional<PracticeMatch> findByIdForUpdate(@Param("id") UUID id);

  /** Public board: matches in a time window, soonest first. */
  List<PracticeMatch> findByStatusAndKickoffAtBetweenOrderByKickoffAtAsc(
      PracticeMatchStatus status, Instant from, Instant to);
}
