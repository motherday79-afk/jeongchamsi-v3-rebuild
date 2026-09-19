package com.jeongchamsi.preview;
/** Loading delay is recoverable; only a document error is a failure. */
public final class StartupGate {
    public static final int WAIT=0, CONTENT=1, ERROR=2, SLOW=3;
    public static final long INTRO_MS=2300, SLOW_MS=15000;
    private final long introEnds;
    private long loadStarted;
    private boolean ready, failed;
    public StartupGate(long started){this(started,true);}
    public StartupGate(long started,boolean playIntro){
        introEnds=started+(playIntro?INTRO_MS:0);loadStarted=started;
    }
    public void ready(){if(!failed)ready=true;}
    public void navigating(long now){ready=false;failed=false;loadStarted=now;}
    public void failed(){failed=true;}
    public int state(long now){
        if(now<introEnds)return WAIT;
        if(failed)return ERROR;
        if(ready)return CONTENT;
        if(now-loadStarted>=SLOW_MS)return SLOW;
        return WAIT;
    }
}
