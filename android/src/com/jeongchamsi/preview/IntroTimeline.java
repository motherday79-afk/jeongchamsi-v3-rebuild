package com.jeongchamsi.preview;
/** Deterministic timing shared by the actual Canvas animation and JVM checks. */
public final class IntroTimeline {
    private IntroTimeline(){}
    public static float progress(long t,long start,long duration){return Math.max(0f,Math.min(1f,(t-start)/(float)duration));}
    public static float settle(float p){return 1-(1-p)*(1-p)*(1-p);}
    public static float ray(long t,int i){return settle(progress(t,80+i*20,500));}
    public static float tagline(long t){return settle(progress(t,740,240));}
    public static float name(long t){return settle(progress(t,1040,300));}
    public static float light(long t){return progress(t,1450,800);}
}
