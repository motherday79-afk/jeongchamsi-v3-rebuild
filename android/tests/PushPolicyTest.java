package com.jeongchamsi.preview;
public final class PushPolicyTest {
 public static void main(String[] args) {
  for(String bad:new String[]{null,"https://evil.test","//evil.test","/now?redirect=bad","/admin"})
   if(!PushPolicy.path(bad).isEmpty())throw new AssertionError(bad);
  if(!PushPolicy.path("/now").equals("/now")||!PushPolicy.path("/ai-panel").equals("/ai-panel"))throw new AssertionError();
  if(PushPolicy.event("bad")||!PushPolicy.event("a".repeat(64)))throw new AssertionError();
  System.out.println("Push destination allowlist passed");
 }
}
