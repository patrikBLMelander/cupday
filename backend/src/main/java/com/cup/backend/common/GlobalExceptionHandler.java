package com.cup.backend.common;

import com.cup.backend.cups.CupNotFoundException;
import com.cup.backend.cups.SlugConflictException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Translates expected exceptions to RFC-7807 problem responses. */
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(CupNotFoundException.class)
  public ResponseEntity<Map<String, Object>> handleCupNotFound(CupNotFoundException ex) {
    return ProblemDetails.response(404, "Not found", ex.getMessage());
  }

  @ExceptionHandler(SlugConflictException.class)
  public ResponseEntity<Map<String, Object>> handleSlugConflict(SlugConflictException ex) {
    return ProblemDetails.response(
        409,
        "Slug already exists",
        ex.getMessage(),
        Map.of("slug", ex.getSlug()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
    return ProblemDetails.response(400, "Validation", ex.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
    var errors = ex.getBindingResult().getFieldErrors().stream()
        .map(GlobalExceptionHandler::fieldErrorEntry)
        .toList();
    return ProblemDetails.response(
        400,
        "Validation",
        "Request body validation failed",
        Map.of("errors", errors));
  }

  private static Map<String, Object> fieldErrorEntry(
      org.springframework.validation.FieldError fe) {
    var entry = new LinkedHashMap<String, Object>();
    entry.put("field", fe.getField());
    entry.put("message", fe.getDefaultMessage());
    return entry;
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex) {
    return ProblemDetails.response(400, "Validation", "Request body is missing or malformed");
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  public ResponseEntity<Map<String, Object>> handleOptimisticLock(
      ObjectOptimisticLockingFailureException ex) {
    return ProblemDetails.response(
        409,
        "Concurrent modification",
        "The resource was modified by another writer; reload and retry");
  }
}
