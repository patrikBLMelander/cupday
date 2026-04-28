package com.cup.backend.teams;

import com.cup.backend.teams.TeamDtos.RegistrationCreateRequest;
import com.cup.backend.teams.TeamDtos.RegistrationCreateResponse;
import com.cup.backend.teams.TeamDtos.RegistrationDetail;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public registration creation + lookup. No auth. */
@RestController
public class RegistrationController {

  private final RegistrationService service;

  public RegistrationController(RegistrationService service) {
    this.service = service;
  }

  @PostMapping("/api/cups/{cupId}/registrations")
  public ResponseEntity<RegistrationCreateResponse> create(
      @PathVariable UUID cupId,
      @Valid @RequestBody RegistrationCreateRequest request) {
    var response = service.register(cupId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping("/api/registrations/{id}")
  public RegistrationDetail get(@PathVariable UUID id) {
    return service.findRegistration(id);
  }
}
