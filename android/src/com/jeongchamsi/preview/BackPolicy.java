package com.jeongchamsi.preview;

/** The clock is injected by the caller; use monotonic uptime, not wall time. */
public final class BackPolicy {
    private final long windowMillis;
    private long firstPress = -1;
    public BackPolicy(long windowMillis) {
        if (windowMillis <= 0) throw new IllegalArgumentException("Positive exit window required");
        this.windowMillis = windowMillis;
    }
    public boolean shouldExit(long now) {
        boolean exit = firstPress >= 0 && now >= firstPress && now - firstPress <= windowMillis;
        firstPress = exit ? -1 : now;
        return exit;
    }
    public void reset() { firstPress = -1; }
}
