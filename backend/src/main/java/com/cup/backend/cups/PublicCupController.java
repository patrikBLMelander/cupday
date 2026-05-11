package com.cup.backend.cups;

import com.cup.backend.cups.CupDtos.CupResponse;
import java.util.List;
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

  /** Landing-page list: all non-draft cups with current free spots. */
  @GetMapping("/public")
  public List<CupResponse> listPublic() {
    return service.listPublic().stream()
        .map(cup -> CupResponse.from(cup, service.countActiveTeams(cup.getId())))
        .toList();
  }

  @GetMapping("/by-slug/{slug}")
  public CupResponse getBySlug(@PathVariable String slug) {
    var cup = service.getBySlug(slug);
    return CupResponse.from(cup, service.countActiveTeams(cup.getId()));
  }
}
