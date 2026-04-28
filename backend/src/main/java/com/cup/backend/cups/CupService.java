package com.cup.backend.cups;

import com.cup.backend.cups.CupDtos.CupCreateRequest;
import com.cup.backend.cups.CupDtos.CupUpdateRequest;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cup CRUD + validation. */
@Service
public class CupService {

  private final CupRepository repository;

  public CupService(CupRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true)
  public List<Cup> listAll() {
    return repository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
  }

  @Transactional(readOnly = true)
  public Cup getById(UUID id) {
    return repository.findById(id)
        .orElseThrow(() -> new CupNotFoundException("Cup " + id + " not found"));
  }

  @Transactional(readOnly = true)
  public Cup getBySlug(String slug) {
    return repository.findBySlug(slug)
        .orElseThrow(() -> new CupNotFoundException("Cup with slug \"" + slug + "\" not found"));
  }

  @Transactional
  public Cup create(CupCreateRequest req) {
    requireDateOrder(req.startDate(), req.endDate());
    if (repository.existsBySlug(req.slug())) {
      throw new SlugConflictException(req.slug());
    }
    var cup = new Cup(
        UUID.randomUUID(),
        req.slug(),
        req.name(),
        req.organizingClubName(),
        req.organizingClubColors().primary(),
        req.organizingClubColors().accent(),
        req.startDate(),
        req.endDate(),
        req.venueName(),
        req.pitchCount(),
        req.maxTeams(),
        req.registrationFeeSek(),
        nullToEmpty(req.paymentInstructions()),
        nullToEmpty(req.paymentLagkassanLink()),
        nullToEmpty(req.paymentLagkassanQrUrl()),
        req.organizerContactName(),
        req.organizerContactEmail(),
        req.organizerContactPhone(),
        CupStatus.DRAFT,
        Instant.now());
    return repository.save(cup);
  }

  @Transactional
  public Cup update(UUID id, CupUpdateRequest req) {
    var cup = getById(id);

    if (req.slug() != null && !req.slug().equals(cup.getSlug())) {
      if (!req.slug().matches("^[a-z0-9-]+$")) {
        throw new IllegalArgumentException("slug must match [a-z0-9-]+");
      }
      if (repository.existsBySlugAndIdNot(req.slug(), id)) {
        throw new SlugConflictException(req.slug());
      }
      cup.setSlug(req.slug());
    }
    if (req.name() != null) cup.setName(req.name());
    if (req.organizingClubName() != null) cup.setOrganizingClubName(req.organizingClubName());
    if (req.organizingClubColors() != null) {
      cup.setPrimaryColorHsl(req.organizingClubColors().primary());
      cup.setAccentColorHsl(req.organizingClubColors().accent());
    }
    if (req.startDate() != null) cup.setStartDate(req.startDate());
    if (req.endDate() != null) cup.setEndDate(req.endDate());
    requireDateOrder(cup.getStartDate(), cup.getEndDate());
    if (req.venueName() != null) cup.setVenueName(req.venueName());
    if (req.pitchCount() != null) {
      if (req.pitchCount() < 1) {
        throw new IllegalArgumentException("pitchCount must be at least 1");
      }
      cup.setPitchCount(req.pitchCount());
    }
    if (req.maxTeams() != null) {
      if (req.maxTeams() < 2) {
        throw new IllegalArgumentException("maxTeams must be at least 2");
      }
      cup.setMaxTeams(req.maxTeams());
    }
    if (req.registrationFeeSek() != null) {
      if (req.registrationFeeSek() < 0) {
        throw new IllegalArgumentException("registrationFeeSek must be non-negative");
      }
      cup.setRegistrationFeeSek(req.registrationFeeSek());
    }
    if (req.paymentInstructions() != null) cup.setPaymentInstructions(req.paymentInstructions());
    if (req.paymentLagkassanLink() != null) cup.setPaymentLagkassanLink(req.paymentLagkassanLink());
    if (req.paymentLagkassanQrUrl() != null) cup.setPaymentLagkassanQrUrl(req.paymentLagkassanQrUrl());
    if (req.organizerContactName() != null) cup.setOrganizerContactName(req.organizerContactName());
    if (req.organizerContactEmail() != null) cup.setOrganizerContactEmail(req.organizerContactEmail());
    if (req.organizerContactPhone() != null) cup.setOrganizerContactPhone(req.organizerContactPhone());
    if (req.status() != null) cup.setStatus(req.status());

    return cup;
  }

  @Transactional
  public void delete(UUID id) {
    if (!repository.existsById(id)) {
      throw new CupNotFoundException("Cup " + id + " not found");
    }
    repository.deleteById(id);
  }

  private static void requireDateOrder(java.time.LocalDate start, java.time.LocalDate end) {
    if (start != null && end != null && start.isAfter(end)) {
      throw new IllegalArgumentException("startDate must be on or before endDate");
    }
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
