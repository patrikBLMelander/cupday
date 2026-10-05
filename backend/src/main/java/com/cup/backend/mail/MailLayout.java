package com.cup.backend.mail;

import java.util.List;

/** Minimal, mail-client-safe HTML around plain paragraphs, facts and buttons (inline styles only). */
final class MailLayout {

  private MailLayout() {
  }

  /** A block of the mail: a paragraph, a label/value list, or a call-to-action button. */
  sealed interface Block permits Paragraph, Facts, Button {}

  record Paragraph(String text) implements Block {}

  record Facts(List<String[]> rows) implements Block {}

  record Button(String label, String url) implements Block {}

  static String html(String heading, List<Block> blocks) {
    var body = new StringBuilder();
    for (var block : blocks) {
      switch (block) {
        case Paragraph p -> body.append("<p style=\"margin:0 0 14px;line-height:1.5\">")
            .append(escape(p.text()).replace("\n", "<br>")).append("</p>");
        case Facts f -> {
          body.append("<table role=\"presentation\" style=\"border-collapse:collapse;margin:0 0 16px\">");
          for (var row : f.rows()) {
            body.append("<tr><td style=\"padding:4px 16px 4px 0;color:#4d5b50;vertical-align:top\">")
                .append(escape(row[0])).append("</td><td style=\"padding:4px 0;font-weight:600\">")
                .append(escape(row[1]).replace("\n", "<br>")).append("</td></tr>");
          }
          body.append("</table>");
        }
        case Button b -> body.append("<p style=\"margin:4px 0 18px\"><a href=\"").append(escape(b.url()))
            .append("\" style=\"display:inline-block;background:#1f7a3a;color:#ffffff;text-decoration:none;")
            .append("font-weight:700;padding:12px 18px;border-radius:10px\">").append(escape(b.label()))
            .append("</a><br><span style=\"font-size:12px;color:#4d5b50;word-break:break-all\">")
            .append(escape(b.url())).append("</span></p>");
      }
    }
    return """
        <!doctype html><html lang="sv"><body style="margin:0;padding:24px;background:#f3f5ef;font-family:Arial,Helvetica,sans-serif;color:#142017">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px">
        <div style="font-size:13px;font-weight:700;color:#1a6b32;letter-spacing:.04em">DIN CUP</div>
        <h1 style="font-size:22px;margin:6px 0 16px">%s</h1>
        %s
        <p style="margin:18px 0 0;font-size:12px;color:#4d5b50">Det här mejlet skickades automatiskt från www.dincup.se. Kontaktuppgifter raderas 30 dagar efter matchen eller cupen.</p>
        </div></body></html>
        """.formatted(escape(heading), body);
  }

  static String text(String heading, List<Block> blocks) {
    var out = new StringBuilder(heading).append("\n\n");
    for (var block : blocks) {
      switch (block) {
        case Paragraph p -> out.append(p.text()).append("\n\n");
        case Facts f -> {
          for (var row : f.rows()) {
            out.append(row[0]).append(": ").append(row[1]).append('\n');
          }
          out.append('\n');
        }
        case Button b -> out.append(b.label()).append(":\n").append(b.url()).append("\n\n");
      }
    }
    return out.append("– Din Cup, www.dincup.se").toString();
  }

  static String escape(String value) {
    return value == null ? "" : value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        .replace("\"", "&quot;").replace("'", "&#39;");
  }
}
