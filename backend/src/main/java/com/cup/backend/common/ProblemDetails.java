package com.cup.backend.common;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * RFC-7807 problem-detail helper. Mirrors the shape used by the frontend's
 * MSW handlers so the backend can drop in without UI changes.
 */
public final class ProblemDetails {

  public static final MediaType MEDIA_TYPE = MediaType.parseMediaType("application/problem+json");

  private ProblemDetails() {
    // Static helper.
  }

  public static ResponseEntity<Map<String, Object>> response(
      int status, String title, String detail) {
    return response(status, title, detail, Map.of());
  }

  public static ResponseEntity<Map<String, Object>> response(
      int status, String title, String detail, Map<String, ?> extensions) {
    var body = new LinkedHashMap<String, Object>();
    body.put("type", "about:blank");
    body.put("title", title);
    body.put("status", status);
    body.put("detail", detail);
    body.putAll(new HashMap<>(extensions));

    var headers = new HttpHeaders();
    headers.setContentType(MEDIA_TYPE);

    return ResponseEntity.status(status).headers(headers).body(body);
  }
}
