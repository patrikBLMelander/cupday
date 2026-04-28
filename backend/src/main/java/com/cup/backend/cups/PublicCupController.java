package com.cup.backend.cups;

import com.cup.backend.cups.CupDtos.CupResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public cup endpoints. No auth required. */
@RestController
@RequestMapping("/api/cups")
public class PublicCupController {

  private final CupService service;

  public PublicCupController(CupService service) {
    this.service = service;
  }

  @GetMapping("/by-slug/{slug}")
  public CupResponse getBySlug(@PathVariable String slug) {
    return CupResponse.from(service.getBySlug(slug));
  }
}
