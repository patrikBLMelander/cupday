package com.cup.backend.cups;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CupLevelQuotaRepository extends JpaRepository<CupLevelQuota, CupLevelQuota.Key> {

  @Query("SELECT q FROM CupLevelQuota q WHERE q.id.cupId = :cupId ORDER BY q.position")
  List<CupLevelQuota> findByCupId(@Param("cupId") UUID cupId);

  @Modifying
  @Query("DELETE FROM CupLevelQuota q WHERE q.id.cupId = :cupId")
  void deleteByCupId(@Param("cupId") UUID cupId);
}
