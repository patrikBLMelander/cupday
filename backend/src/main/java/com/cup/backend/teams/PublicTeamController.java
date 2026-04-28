package com.cup.backend.teams;

import com.cup.backend.teams.TeamDtos.PublicTeam;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public team list per cup. No auth. */
@RestController
@RequestMapping("/api/cups")
public class PublicTeamController {

  private final RegistrationService service;

  public PublicTeamController(RegistrationService service) {
    this.service = service;
  }

  @GetMapping("/{cupId}/teams")
  public List<PublicTeam> list(@PathVariable UUID cupId) {
    return service.listPublicTeams(cupId);
  }
}
