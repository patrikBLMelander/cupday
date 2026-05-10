package com.cup.backend.schedule;

import com.cup.backend.schedule.ScheduleDtos.MatchResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public match list per cup. No auth. */
@RestController
@RequestMapping("/api/cups")
public class PublicScheduleController {

  private final ScheduleService service;

  public PublicScheduleController(ScheduleService service) {
    this.service = service;
  }

  @GetMapping("/{cupId}/matches")
  public List<MatchResponse> list(@PathVariable UUID cupId) {
    return service.listByCup(cupId).stream().map(MatchResponse::from).toList();
  }
}
