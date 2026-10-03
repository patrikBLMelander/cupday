package com.cup.backend.practicematches;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PracticeMatchBookingRepository extends JpaRepository<PracticeMatchBooking, UUID> {

  /** Bookings for several matches in one query (avoids N+1 on the board). */
  List<PracticeMatchBooking> findByMatchIdInAndStatusOrderByCreatedAtAsc(
      Collection<UUID> matchIds, BookingStatus status);

  List<PracticeMatchBooking> findByMatchIdOrderByCreatedAtAsc(UUID matchId);

  Optional<PracticeMatchBooking> findByIdAndMatchId(UUID id, UUID matchId);
}
