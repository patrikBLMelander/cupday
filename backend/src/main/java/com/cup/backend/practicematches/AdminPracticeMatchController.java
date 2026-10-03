package com.cup.backend.practicematches;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin moderation of the practice-match board. Auth enforced by SecurityConfig on /api/admin/**. */
@RestController
@RequestMapping("/api/admin/practice-matches")
public class AdminPracticeMatchController {

  private final PracticeMatchService service;

  public AdminPracticeMatchController(PracticeMatchService service) {
    this.service = service;
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    service.adminDelete(id);
    return ResponseEntity.noContent().build();
  }
}
