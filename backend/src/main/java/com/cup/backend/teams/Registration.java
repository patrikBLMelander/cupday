package com.cup.backend.teams;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "registration")
public class Registration {

  @Id
  private UUID id;

  @Column(name = "cup_id", nullable = false)
  private UUID cupId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected Registration() {
    // Required by JPA.
  }

  public Registration(UUID id, UUID cupId, Instant createdAt) {
    this.id = id;
    this.cupId = cupId;
    this.createdAt = createdAt;
  }

  public UUID getId() {
    return id;
  }

  public UUID getCupId() {
    return cupId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
