package com.cup.backend.schedule;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MatchRepository extends JpaRepository<Match, UUID> {

  List<Match> findByCupIdOrderByStartTimeAsc(UUID cupId);

  @Transactional
  void deleteByCupId(UUID cupId);
}
