package com.cup.backend.share;

import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupNotFoundException;
import com.cup.backend.cups.CupService;
import com.cup.backend.practicematches.PracticeMatchDtos.PublicPracticeMatch;
import com.cup.backend.practicematches.PracticeMatchNotFoundException;
import com.cup.backend.practicematches.PracticeMatchService;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Server-rendered Open Graph pages for link previews (WhatsApp, Facebook, …), which do not run
 * JavaScript. The frontend's nginx routes only link-preview bots here; people get the SPA.
 */
@RestController
@RequestMapping("/api/og")
public class LinkPreviewController {

  private static final MediaType HTML_UTF8 = new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8);
  private static final ZoneId ZONE = ZoneId.of("Europe/Stockholm");
  private static final Locale SWEDISH = Locale.forLanguageTag("sv-SE");
  private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", SWEDISH);
  private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", SWEDISH);
  private static final List<String> LEVELS =
      List.of("Lätt−", "Lätt", "Lätt+", "Medel−", "Medel", "Medel+", "Svår−", "Svår", "Svår+");
  private static final String DEFAULT_TITLE = "Din Cup – matcher & cuper";
  private static final String DEFAULT_DESCRIPTION =
      "Hitta motstånd och boka en plats. Alla åldrar på ett ställe. Inget konto behövs.";
  private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic();

  private final PracticeMatchService matchService;
  private final CupService cupService;
  private final String siteUrl;

  public LinkPreviewController(
      PracticeMatchService matchService,
      CupService cupService,
      @Value("${cup.public.site-url:http://localhost:5173}") String siteUrl) {
    this.matchService = matchService;
    this.cupService = cupService;
    this.siteUrl = siteUrl.replaceAll("/+$", "");
  }

  /** Start page and the match feed: generic site preview. */
  @GetMapping(value = {"/site", "/matches"}, produces = "text/html;charset=UTF-8")
  public ResponseEntity<String> site(HttpServletRequest request) {
    var path = request.getRequestURI().endsWith("/matches") ? "/matcher" : "/";
    return html(DEFAULT_TITLE, DEFAULT_DESCRIPTION, siteUrl + path);
  }

  @GetMapping(value = "/match/{id}", produces = "text/html;charset=UTF-8")
  public ResponseEntity<String> match(@PathVariable String id) {
    var url = siteUrl + "/matcher/" + id;
    try {
      var match = matchService.get(UUID.fromString(id));
      return html(matchTitle(match), matchDescription(match), url);
    } catch (IllegalArgumentException | PracticeMatchNotFoundException e) {
      return html(DEFAULT_TITLE, DEFAULT_DESCRIPTION, url);
    }
  }

  @GetMapping(value = "/cup/{slug}", produces = "text/html;charset=UTF-8")
  public ResponseEntity<String> cup(@PathVariable String slug) {
    var url = siteUrl + "/c/" + slug;
    try {
      var cup = cupService.getBySlug(slug);
      return html("🏆 " + cup.getName(), cupDescription(cup, cupService.countActiveTeams(cup.getId())), url);
    } catch (CupNotFoundException e) {
      return html(DEFAULT_TITLE, DEFAULT_DESCRIPTION, url);
    }
  }

  static String matchTitle(PublicPracticeMatch match) {
    var age = (match.gender().name().equals("MIX") ? "Mix" : match.gender().name())
        + String.valueOf(match.birthYear()).substring(2);
    return match.teamName() + " söker motstånd – " + age + " " + match.playersPerSide() + "v" + match.playersPerSide();
  }

  static String matchDescription(PublicPracticeMatch match) {
    var kickoff = match.kickoffAt().atZone(ZONE);
    var end = match.endsAt().atZone(ZONE);
    var parts = new ArrayList<String>();
    parts.add(capitalize(day(kickoff)) + " " + TIME.format(kickoff) + "–" + TIME.format(end));
    parts.add(match.venue());
    parts.add("Nivå " + levelRange(match.levelMin(), match.levelMax()));
    parts.add(match.freeSlots() == 0
        ? "Fullbokad"
        : match.freeSlots() + " av " + match.opponentSlots() + (match.opponentSlots() == 1 ? " plats ledig" : " platser lediga"));
    return String.join(" · ", parts);
  }

  static String cupDescription(Cup cup, int activeTeams) {
    var parts = new ArrayList<String>();
    parts.add(dateSpan(cup.getStartDate(), cup.getEndDate()) + times(cup.getStartTime(), cup.getEndTime()));
    parts.add(cup.getVenueName());
    if (!cup.getAgeClasses().isBlank()) {
      parts.add(cup.getAgeClasses().replace(",", ", "));
    }
    parts.add(cup.getPlayersPerTeam() + "v" + cup.getPlayersPerTeam());
    var remaining = Math.max(0, cup.getMaxTeams() - activeTeams);
    parts.add(remaining == 0 ? "Fullbokad" : remaining + " av " + cup.getMaxTeams() + " lagplatser kvar");
    return String.join(" · ", parts);
  }

  private ResponseEntity<String> html(String title, String description, String url) {
    var image = siteUrl + "/og-image.png";
    var page = """
        <!doctype html>
        <html lang="sv">
        <head>
        <meta charset="utf-8">
        <title>%1$s</title>
        <meta name="description" content="%2$s">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="Din Cup">
        <meta property="og:locale" content="sv_SE">
        <meta property="og:title" content="%1$s">
        <meta property="og:description" content="%2$s">
        <meta property="og:url" content="%3$s">
        <meta property="og:image" content="%4$s">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta name="twitter:card" content="summary_large_image">
        <meta http-equiv="refresh" content="0; url=%3$s">
        </head>
        <body><a href="%3$s">%1$s</a></body>
        </html>
        """.formatted(escape(title), escape(description), escape(url), escape(image));
    return ResponseEntity.ok().cacheControl(CACHE).contentType(HTML_UTF8).body(page);
  }

  private static String levelRange(int min, int max) {
    return min == max ? LEVELS.get(min - 1) : LEVELS.get(min - 1) + " till " + LEVELS.get(max - 1);
  }

  private static String dateSpan(LocalDate start, LocalDate end) {
    var first = capitalize(day(start));
    return start.equals(end) ? first : first + " – " + day(end);
  }

  private static String times(LocalTime start, LocalTime end) {
    if (start == null) {
      return "";
    }
    return " " + TIME.format(start) + (end == null ? "" : "–" + TIME.format(end));
  }

  /** Swedish short dates come out as "lör 10 okt." — drop the abbreviation dots. */
  private static String day(TemporalAccessor date) {
    return DAY.format(date).replace(".", "");
  }

  private static String capitalize(String value) {
    return value.isEmpty() ? value : Character.toUpperCase(value.charAt(0)) + value.substring(1);
  }

  /** Minimal HTML escaping for text and attribute values. */
  static String escape(String value) {
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
  }
}
