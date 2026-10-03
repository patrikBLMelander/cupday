package com.cup.backend.practicematches;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Sliding-window limit on anonymous POSTs per client IP. In-memory and per instance — good enough
 * against casual spam while the backend runs as a single Railway service.
 */
@Component
public class PostRateLimiter {

  private static final int CLEANUP_THRESHOLD = 10_000;

  private final int maxPosts;
  private final Duration window;
  private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

  public PostRateLimiter(
      @Value("${cup.practice-matches.rate-limit.max-posts:20}") int maxPosts,
      @Value("${cup.practice-matches.rate-limit.window-minutes:10}") long windowMinutes) {
    this.maxPosts = maxPosts;
    this.window = Duration.ofMinutes(windowMinutes);
  }

  /** Records a POST from the request's client and throws when the limit is exceeded. */
  public void check(HttpServletRequest request) {
    var now = Instant.now();
    var cutoff = now.minus(window);
    if (hits.size() > CLEANUP_THRESHOLD) {
      hits.entrySet().removeIf(entry -> isStale(entry.getValue(), cutoff));
    }
    var deque = hits.computeIfAbsent(clientIp(request), key -> new ArrayDeque<>());
    synchronized (deque) {
      while (!deque.isEmpty() && deque.peekFirst().isBefore(cutoff)) {
        deque.pollFirst();
      }
      if (deque.size() >= maxPosts) {
        throw new RateLimitedException("Too many requests, try again later");
      }
      deque.addLast(now);
    }
  }

  private static boolean isStale(Deque<Instant> deque, Instant cutoff) {
    synchronized (deque) {
      return deque.isEmpty() || deque.peekLast().isBefore(cutoff);
    }
  }

  private static String clientIp(HttpServletRequest request) {
    var forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }
}
