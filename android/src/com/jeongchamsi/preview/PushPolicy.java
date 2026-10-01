package com.jeongchamsi.preview;
/** Payloads never select arbitrary WebView URLs. */
public final class PushPolicy {
 public static String path(String value) {
  if(value!=null&&value.matches("/groups/[a-zA-Z0-9_-]{1,100}(\\?tab=notifications)?"))return value;
  return "/now".equals(value) || "/ai-panel".equals(value) ? value : "";
 }
 public static boolean event(String value) { return value != null && value.matches("[a-f0-9]{64}"); }
}
