package com.cup.backend.auth;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Tiny CLI for generating bcrypt hashes you can paste into
 * {@code CUP_ADMIN_PASSWORD_HASH}. Run via:
 *
 * <pre>
 * mvn -q exec:java -Dexec.mainClass=com.cup.backend.auth.BcryptHashCli -Dexec.args=mypassword
 * </pre>
 */
public final class BcryptHashCli {

  private BcryptHashCli() {
    // CLI only.
  }

  public static void main(String[] args) {
    if (args.length != 1 || args[0].isBlank()) {
      System.err.println("Usage: BcryptHashCli <plaintext-password>");
      System.exit(1);
    }
    var encoder = new BCryptPasswordEncoder();
    System.out.println(encoder.encode(args[0]));
  }
}
