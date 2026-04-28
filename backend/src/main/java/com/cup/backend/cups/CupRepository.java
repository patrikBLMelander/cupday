package com.cup.backend.cups;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CupRepository extends JpaRepository<Cup, UUID> {

  Optional<Cup> findBySlug(String slug);

  boolean existsBySlug(String slug);

  boolean existsBySlugAndIdNot(String slug, UUID id);
}
