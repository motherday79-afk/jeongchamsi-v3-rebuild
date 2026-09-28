package com.jeongchamsi.preview;
/** Payloads never select arbitrary WebView URLs. */
public final class PushPolicy {
 public static String path(String value) {
  return "/now".equals(value) || "/ai-panel".equals(value) ? value : "";
 }
 public static boolean event(String value) { return value != null && value.matches("[a-f0-9]{64}"); }
}
