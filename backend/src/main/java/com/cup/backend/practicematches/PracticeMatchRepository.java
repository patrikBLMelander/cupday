package com.cup.backend.practicematches;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
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

  /** Admin moderation list, newest posts first. */
  Page<PracticeMatch> findAllByOrderByCreatedAtDesc(Pageable pageable);

  /** Admin moderation search on team, venue and contact fields (case-insensitive substring). */
  @Query("""
      SELECT m FROM PracticeMatch m
      WHERE LOWER(m.teamName) LIKE LOWER(CONCAT('%', :q, '%'))
         OR LOWER(m.venue) LIKE LOWER(CONCAT('%', :q, '%'))
         OR LOWER(m.contactName) LIKE LOWER(CONCAT('%', :q, '%'))
         OR LOWER(m.contactEmail) LIKE LOWER(CONCAT('%', :q, '%'))
      ORDER BY m.createdAt DESC""")
  Page<PracticeMatch> search(@Param("q") String q, Pageable pageable);

  /** Bulk delete for data retention; bookings go with the DB-level ON DELETE CASCADE. */
  @Modifying
  @Query("DELETE FROM PracticeMatch m WHERE m.kickoffAt < :cutoff")
  int deleteByKickoffAtBefore(@Param("cutoff") Instant cutoff);
}
