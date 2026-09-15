package com.jeongchamsi.preview;
/** No WebView timing assumptions. A ready DOM alone cannot skip the intro. */
public final class StartupGate {
    public static final int WAIT=0, CONTENT=1, ERROR=2;
    public static final long INTRO_MS=2300, TIMEOUT_MS=15000;
    private final long started;
    private boolean ready, failed, timedOut;
    public StartupGate(long started){this.started=started;}
    public void ready(){ready=true;}
    public void navigating(){ready=false;failed=false;}
    public void failed(){failed=true;}
    public int state(long now){
        long elapsed=Math.max(0,now-started);
        if(elapsed<INTRO_MS)return WAIT;
        if(timedOut||failed)return ERROR;
        if(ready)return CONTENT;
        if(elapsed>=TIMEOUT_MS){timedOut=true;return ERROR;}
        return WAIT;
    }
}
