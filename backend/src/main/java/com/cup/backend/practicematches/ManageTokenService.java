package com.cup.backend.practicematches;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.stereotype.Service;

/** Generates and verifies the secret tokens that replace accounts for posting and booking. */
@Service
public class ManageTokenService {

  private static final int TOKEN_BYTES = 32;

  private final SecureRandom random = new SecureRandom();

  /** Returns a new random URL-safe token. */
  public String generate() {
    var bytes = new byte[TOKEN_BYTES];
    random.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  /** SHA-256 hex digest of the token; only the hash is persisted. */
  public String hash(String token) {
    return HexFormat.of().formatHex(sha256(token));
  }

  /** Constant-time comparison of a presented token against a stored hash. */
  public boolean matches(String token, String storedHash) {
    if (token == null || token.isBlank() || storedHash == null) {
      return false;
    }
    var expected = HexFormat.of().parseHex(storedHash);
    return MessageDigest.isEqual(sha256(token), expected);
  }

  private static byte[] sha256(String token) {
    try {
      return MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not available", e);
    }
  }
}
