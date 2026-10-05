package com.cup.backend.mail;

import com.cup.backend.cups.Cup;
import com.cup.backend.cups.CupRepository;
import com.cup.backend.mail.MailLayout.Block;
import com.cup.backend.mail.MailLayout.Button;
import com.cup.backend.mail.MailLayout.Facts;
import com.cup.backend.mail.MailLayout.Paragraph;
import com.cup.backend.mail.NotificationEvents.CupPosted;
import com.cup.backend.mail.NotificationEvents.CupTeamsRegistered;
import com.cup.backend.mail.NotificationEvents.PracticeMatchBooked;
import com.cup.backend.mail.NotificationEvents.PracticeMatchPosted;
import com.cup.backend.practicematches.BookingStatus;
import com.cup.backend.practicematches.PracticeMatch;
import com.cup.backend.practicematches.PracticeMatchBooking;
import com.cup.backend.practicematches.PracticeMatchBookingRepository;
import com.cup.backend.practicematches.PracticeMatchRepository;
import com.cup.backend.teams.TeamRepository;
import com.cup.backend.teams.TeamStatus;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Turns domain events into emails: confirmations with the manage link when something is posted,
 * and notices to both sides when a match is booked or a team registers for a cup. Runs after
 * commit on a background thread; failures are logged and never affect the request.
 */
@Service
public class NotificationService {

  private static final Logger LOG = LoggerFactory.getLogger(NotificationService.class);
  private static final ZoneId ZONE = ZoneId.of("Europe/Stockholm");
  private static final Locale SWEDISH = Locale.forLanguageTag("sv-SE");
  private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEEE d MMMM", SWEDISH);
  private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", SWEDISH);
  private static final List<String> LEVELS =
      List.of("Lätt−", "Lätt", "Lätt+", "Medel−", "Medel", "Medel+", "Svår−", "Svår", "Svår+");

  private final MailSender mailSender;
  private final PracticeMatchRepository matchRepository;
  private final PracticeMatchBookingRepository bookingRepository;
  private final CupRepository cupRepository;
  private final TeamRepository teamRepository;
  private final String siteUrl;

  public NotificationService(
      MailSender mailSender,
      PracticeMatchRepository matchRepository,
      PracticeMatchBookingRepository bookingRepository,
      CupRepository cupRepository,
      TeamRepository teamRepository,
      @Value("${cup.public.site-url:http://localhost:5173}") String siteUrl) {
    this.mailSender = mailSender;
    this.matchRepository = matchRepository;
    this.bookingRepository = bookingRepository;
    this.cupRepository = cupRepository;
    this.teamRepository = teamRepository;
    this.siteUrl = siteUrl.replaceAll("/+$", "");
  }

  @Async
  @TransactionalEventListener
  @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
  public void onMatchPosted(PracticeMatchPosted event) {
    matchRepository.findById(event.matchId()).ifPresent(match -> {
      var heading = "Din träningsmatch är upplagd";
      var blocks = List.<Block>of(
          new Paragraph("Hej " + firstName(match.getContactName()) + "! Er match ligger nu ute på dincup.se:"),
          new Facts(matchFacts(match)),
          new Paragraph("Spara det här mejlet. Med länken nedan ändrar eller ställer du in matchen och ser vilka lag som har bokat. "
              + "Du får också ett mejl så fort någon bokar."),
          new Button("Hantera matchen", siteUrl + "/matcher/" + match.getId() + "/hantera#" + encode(event.manageToken())),
          new Paragraph("Tips: dela matchen i valfri WhatsApp-grupp så hittar fler lag den."),
          new Button("Visa matchen", matchUrl(match)));
      send(match.getContactEmail(), heading + ": " + match.getTeamName(), heading, blocks, null);
    });
  }

  @Async
  @TransactionalEventListener
  @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
  public void onMatchBooked(PracticeMatchBooked event) {
    var match = matchRepository.findById(event.matchId()).orElse(null);
    var booking = bookingRepository.findById(event.bookingId()).orElse(null);
    if (match == null || booking == null) {
      return;
    }
    var free = Math.max(0, match.getOpponentSlots()
        - bookingRepository.findByMatchIdInAndStatusOrderByCreatedAtAsc(List.of(match.getId()),
            BookingStatus.BOOKED).size());

    var organizerBlocks = new ArrayList<Block>();
    organizerBlocks.add(new Paragraph("Hej " + firstName(match.getContactName()) + "! " + booking.getTeamName()
        + " har bokat en plats i er match " + shortWhen(match) + "."));
    organizerBlocks.add(new Facts(bookerFacts(booking)));
    organizerBlocks.add(new Paragraph("Hör av er till dem för att stämma av detaljerna. Du kan svara direkt på det här mejlet. "
        + (free == 0 ? "Matchen är nu fullbokad." : "Lediga platser kvar: " + free + ".")));
    organizerBlocks.add(new Paragraph("Bokningar och kontaktuppgifter finns också via hanteringslänken i mejlet du fick när du lade upp matchen."));
    organizerBlocks.add(new Button("Visa matchen", matchUrl(match)));
    send(match.getContactEmail(), booking.getTeamName() + " har bokat er match " + shortWhen(match),
        "Ny bokning av er match", organizerBlocks, booking.getContactEmail());

    var bookerBlocks = List.<Block>of(
        new Paragraph("Hej " + firstName(booking.getContactName()) + "! Ni har bokat en plats som " + booking.getTeamName() + "."),
        new Facts(matchFacts(match)),
        new Facts(List.of(
            new String[] {"Arrangör", match.getContactName()},
            new String[] {"Telefon", match.getContactPhone()},
            new String[] {"E-post", match.getContactEmail()})),
        new Paragraph("Arrangören har fått era kontaktuppgifter. Du kan svara direkt på det här mejlet för att nå dem."),
        new Button("Avboka", siteUrl + "/matcher/" + match.getId() + "#avboka." + booking.getId() + "." + encode(event.bookingToken())),
        new Paragraph("Avboka gärna i god tid om ni inte kan komma, så att platsen blir ledig för ett annat lag."));
    send(booking.getContactEmail(), "Bokningsbekräftelse: " + match.getTeamName() + " " + shortWhen(match),
        "Ni har bokat en plats", bookerBlocks, match.getContactEmail());
  }

  @Async
  @TransactionalEventListener
  @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
  public void onCupPosted(CupPosted event) {
    cupRepository.findById(event.cupId()).ifPresent(cup -> {
      var heading = "Din cup är publicerad";
      var blocks = List.<Block>of(
          new Paragraph("Hej " + firstName(cup.getOrganizerContactName()) + "! " + cup.getName() + " ligger nu ute på dincup.se."),
          new Facts(cupFacts(cup)),
          new Paragraph("Spara det här mejlet. Adminlänken är enda vägen till adminsidan, där du ser anmälda lag, "
              + "markerar vilka som har betalat och ändrar cupen. Du får också ett mejl när ett lag anmäler sig."),
          new Button("Till adminsidan", siteUrl + "/matcher/cup/" + cup.getId() + "/hantera#" + encode(event.manageToken())),
          new Button("Visa cupens sida", siteUrl + "/c/" + cup.getSlug()));
      send(cup.getOrganizerContactEmail(), heading + ": " + cup.getName(), heading, blocks, null);
    });
  }

  @Async
  @TransactionalEventListener
  @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
  public void onCupTeamsRegistered(CupTeamsRegistered event) {
    var cup = cupRepository.findById(event.cupId()).orElse(null);
    if (cup == null || !cup.isPubliclyPosted()) {
      return;
    }
    var teams = teamRepository.findAllById(event.teamIds());
    if (teams.isEmpty()) {
      return;
    }
    var first = teams.getFirst();
    var rows = new ArrayList<String[]>();
    for (var team : teams) {
      var detail = String.join(" · ", Stream.of(team.getAgeClass(), team.getLevel())
          .filter(v -> v != null && !v.isBlank()).toList());
      rows.add(new String[] {"Lag", team.getName() + (detail.isEmpty() ? "" : " (" + detail + ")")});
    }
    rows.add(new String[] {"Klubb", first.getClubName()});
    rows.add(new String[] {"Kontaktperson", first.getContactName()});
    rows.add(new String[] {"Telefon", first.getContactPhone()});
    rows.add(new String[] {"E-post", first.getContactEmail()});
    var active = teamRepository.countActiveByCupId(cup.getId());
    var paid = teamRepository.findByCupIdOrderByCreatedAtAsc(cup.getId()).stream()
        .filter(t -> t.getStatus() == TeamStatus.PAID).count();
    var blocks = List.<Block>of(
        new Paragraph("Hej " + firstName(cup.getOrganizerContactName()) + "! Ett nytt lag har anmält sig till " + cup.getName() + "."),
        new Facts(rows),
        new Paragraph("Anmälda lag: " + active + " av " + cup.getMaxTeams() + ", varav " + paid + " betalda. "
            + "Markera laget som betalt på adminsidan när betalningen kommit in. Du kan svara direkt på det här mejlet för att nå laget."),
        new Paragraph("Adminsidan når du via adminlänken i mejlet du fick när du publicerade cupen."),
        new Button("Visa cupens sida", siteUrl + "/c/" + cup.getSlug()));
    send(cup.getOrganizerContactEmail(), "Ny anmälan till " + cup.getName() + ": " + first.getName(),
        "Ny anmälan till " + cup.getName(), blocks, first.getContactEmail());
  }

  private void send(String to, String subject, String heading, List<Block> blocks, String replyTo) {
    if (to == null || to.isBlank()) {
      return;
    }
    try {
      mailSender.send(new MailMessage(to, subject, MailLayout.text(heading, blocks), MailLayout.html(heading, blocks), replyTo));
    } catch (RuntimeException e) {
      LOG.warn("Notification \"{}\" failed: {}", subject, e.toString());
    }
  }

  private List<String[]> matchFacts(PracticeMatch match) {
    var age = (match.getGender().name().equals("MIX") ? "Mix" : match.getGender().name())
        + String.valueOf(match.getBirthYear()).substring(2);
    var level = match.getLevelMin() == match.getLevelMax()
        ? LEVELS.get(match.getLevelMin() - 1)
        : LEVELS.get(match.getLevelMin() - 1) + " till " + LEVELS.get(match.getLevelMax() - 1);
    return List.of(
        new String[] {"Lag", match.getTeamName()},
        new String[] {"När", capitalize(fullWhen(match))},
        new String[] {"Plats", match.getVenue()},
        new String[] {"Ålder & spelform", age + " · " + match.getPlayersPerSide() + "v" + match.getPlayersPerSide()},
        new String[] {"Nivå", level});
  }

  private static List<String[]> bookerFacts(PracticeMatchBooking booking) {
    var rows = new ArrayList<String[]>();
    rows.add(new String[] {"Lag", booking.getTeamName()});
    rows.add(new String[] {"Kontaktperson", booking.getContactName()});
    rows.add(new String[] {"Telefon", booking.getContactPhone()});
    rows.add(new String[] {"E-post", booking.getContactEmail()});
    if (booking.getMessage() != null && !booking.getMessage().isBlank()) {
      rows.add(new String[] {"Meddelande", booking.getMessage()});
    }
    return rows;
  }

  private static List<String[]> cupFacts(Cup cup) {
    var days = cup.getStartDate().equals(cup.getEndDate())
        ? capitalize(day(cup.getStartDate()))
        : capitalize(day(cup.getStartDate())) + " – " + day(cup.getEndDate());
    var times = cup.getStartTime() == null ? "" : " " + TIME.format(cup.getStartTime())
        + (cup.getEndTime() == null ? "" : "–" + TIME.format(cup.getEndTime()));
    return List.of(
        new String[] {"Cup", cup.getName()},
        new String[] {"När", days + times},
        new String[] {"Plats", cup.getVenueName()},
        new String[] {"Antal lag", String.valueOf(cup.getMaxTeams())});
  }

  private static String fullWhen(PracticeMatch match) {
    var start = match.getKickoffAt().atZone(ZONE);
    return day(start) + " " + TIME.format(start) + "–" + TIME.format(match.getEndsAt().atZone(ZONE));
  }

  private static String shortWhen(PracticeMatch match) {
    var start = match.getKickoffAt().atZone(ZONE);
    return start.getDayOfMonth() + "/" + start.getMonthValue() + " " + TIME.format(start);
  }

  private String matchUrl(PracticeMatch match) {
    return siteUrl + "/matcher/" + match.getId();
  }

  private static String day(TemporalAccessor date) {
    return DAY.format(date);
  }

  private static String firstName(String name) {
    return name == null || name.isBlank() ? "" : name.trim().split("\\s+")[0];
  }

  private static String capitalize(String value) {
    return value.isEmpty() ? value : Character.toUpperCase(value.charAt(0)) + value.substring(1);
  }

  private static String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
