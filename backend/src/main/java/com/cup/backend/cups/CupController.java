package com.cup.backend.cups;

import com.cup.backend.cups.CupDtos.CupCreateRequest;
import com.cup.backend.cups.CupDtos.CupResponse;
import com.cup.backend.cups.CupDtos.CupUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin cup CRUD. Auth enforced by SecurityConfig on /api/admin/**. */
@RestController
@RequestMapping("/api/admin/cups")
public class CupController {

  private final CupService service;

  public CupController(CupService service) {
    this.service = service;
  }

  @GetMapping
  public List<CupResponse> list() {
    return service.listAll().stream().map(CupResponse::from).toList();
  }

  @PostMapping
  public ResponseEntity<CupResponse> create(@Valid @RequestBody CupCreateRequest request) {
    var cup = service.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(CupResponse.from(cup));
  }

  @GetMapping("/{id}")
  public CupResponse get(@PathVariable UUID id) {
    return CupResponse.from(service.getById(id));
  }

  @PatchMapping("/{id}")
  public CupResponse update(@PathVariable UUID id, @RequestBody CupUpdateRequest request) {
    return CupResponse.from(service.update(id, request));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}
