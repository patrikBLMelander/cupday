package com.cup.backend.postedcups;

import com.cup.backend.cups.CupRepository;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * GDPR retention for publicly posted cups: deletes them (teams, registrations and contact details
 * cascade) a fixed number of days after the last cup day. Admin-created cups are kept. Idempotent.
 */
@Component
public class PostedCupRetentionJob {

  private static final Logger LOG = LoggerFactory.getLogger(PostedCupRetentionJob.class);

  private final CupRepository cupRepository;
  private final long retentionDays;

  public PostedCupRetentionJob(
      CupRepository cupRepository,
      @Value("${cup.practice-matches.retention-days:30}") long retentionDays) {
    this.cupRepository = cupRepository;
    this.retentionDays = retentionDays;
  }

  /** Runs nightly; returns the number of deleted cups. */
  @Scheduled(cron = "${cup.public-cups.retention-cron:0 40 3 * * *}", zone = "Europe/Stockholm")
  @Transactional
  public int purgeExpired() {
    var deleted = cupRepository.deletePubliclyPostedEndingBefore(LocalDate.now().minusDays(retentionDays));
    if (deleted > 0) {
      LOG.info("Deleted {} publicly posted cups older than {} days", deleted, retentionDays);
    }
    return deleted;
  }
}
