package com.cup.backend.practicematches;

import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * GDPR retention: deletes practice matches (and, via cascade, their bookings and contact details)
 * a fixed number of days after kickoff. The delete is idempotent, so overlapping runs on several
 * instances are harmless and no distributed lock is needed.
 */
@Component
public class PracticeMatchRetentionJob {

  private static final Logger LOG = LoggerFactory.getLogger(PracticeMatchRetentionJob.class);

  private final PracticeMatchRepository matchRepository;
  private final Duration retention;

  public PracticeMatchRetentionJob(
      PracticeMatchRepository matchRepository,
      @Value("${cup.practice-matches.retention-days:30}") long retentionDays) {
    this.matchRepository = matchRepository;
    this.retention = Duration.ofDays(retentionDays);
  }

  /** Runs nightly; returns the number of deleted matches. */
  @Scheduled(cron = "${cup.practice-matches.retention-cron:0 30 3 * * *}", zone = "Europe/Stockholm")
  @Transactional
  public int purgeExpired() {
    var deleted = matchRepository.deleteByKickoffAtBefore(Instant.now().minus(retention));
    if (deleted > 0) {
      LOG.info("Deleted {} practice matches older than {} days", deleted, retention.toDays());
    }
    return deleted;
  }
}
