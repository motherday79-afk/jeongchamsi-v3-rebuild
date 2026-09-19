package com.jeongchamsi.preview;
public final class BackPolicyTest {
  private static int checks;
  private static void expect(boolean value) { checks++; if (!value) throw new AssertionError("check " + checks); }
  public static void main(String[] args) {
    BackPolicy p = new BackPolicy(2000);
    expect(!p.shouldExit(0)); expect(p.shouldExit(100));
    p.reset(); expect(!p.shouldExit(1000)); expect(!p.shouldExit(3001)); expect(p.shouldExit(3100));
    p.reset(); expect(!p.shouldExit(4000)); p.reset(); expect(!p.shouldExit(4200));
    p.reset(); expect(!p.shouldExit(6000)); expect(p.shouldExit(8000));
    p.reset(); expect(!p.shouldExit(10000)); expect(!p.shouldExit(9000));
    try { new BackPolicy(0); throw new AssertionError(); } catch (IllegalArgumentException expected) { checks++; }
    System.out.println("BackPolicy: " + checks + " assertions passed");
  }
}
