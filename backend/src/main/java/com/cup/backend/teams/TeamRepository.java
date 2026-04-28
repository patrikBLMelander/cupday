package com.cup.backend.teams;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamRepository extends JpaRepository<Team, UUID> {

  /** Active = not cancelled. Used for capacity checks and the public team list. */
  @Query("SELECT t FROM Team t WHERE t.cupId = :cupId AND t.status <> com.cup.backend.teams.TeamStatus.CANCELLED ORDER BY t.createdAt ASC")
  List<Team> findActiveByCupId(@Param("cupId") UUID cupId);

  @Query("SELECT COUNT(t) FROM Team t WHERE t.cupId = :cupId AND t.status <> com.cup.backend.teams.TeamStatus.CANCELLED")
  long countActiveByCupId(@Param("cupId") UUID cupId);

  List<Team> findByRegistrationIdOrderByCreatedAtAsc(UUID registrationId);
}
