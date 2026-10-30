-- Who cancelled a booking: BOOKER (the booking team) or ORGANIZER. Null for active and older bookings.
ALTER TABLE practice_match_booking ADD COLUMN cancelled_by TEXT;
