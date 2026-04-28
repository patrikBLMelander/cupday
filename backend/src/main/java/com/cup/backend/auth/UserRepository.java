package com.cup.backend.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

  /** Case-insensitive email lookup; backed by the lower(email) unique index. */
  @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
  Optional<User> findByEmailIgnoreCase(@Param("email") String email);
}
