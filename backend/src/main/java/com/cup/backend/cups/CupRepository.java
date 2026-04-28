package com.cup.backend.cups;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CupRepository extends JpaRepository<Cup, UUID> {

  Optional<Cup> findBySlug(String slug);

  boolean existsBySlug(String slug);

  boolean existsBySlugAndIdNot(String slug, UUID id);

  /** Pessimistic write lock on the cup row — used to serialize registrations on the same cup. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT c FROM Cup c WHERE c.id = :id")
  Optional<Cup> findByIdForUpdate(@Param("id") UUID id);
}
