package com.cup.backend.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Enables {@code @Scheduled} jobs (e.g. practice-match data retention). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
