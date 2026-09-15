package com.jeongchamsi.preview;
public final class StartupTest {
    private static int checks;
    static void expect(boolean b,String name){checks++;if(!b)throw new AssertionError(name);}
    public static void main(String[] args){
        StartupGate fast=new StartupGate(1000);
        fast.ready();
        expect(fast.state(3299)==StartupGate.WAIT,"fast page stays for full intro");
        expect(fast.state(3300)==StartupGate.CONTENT,"fast page revealed after intro");
        fast.navigating();
        expect(fast.state(3300)==StartupGate.WAIT,"new navigation clears already-ready page");
        fast.ready();expect(fast.state(3500)==StartupGate.CONTENT,"new page readiness releases intro");
        StartupGate slow=new StartupGate(0);
        expect(slow.state(2300)==StartupGate.WAIT,"animation completion is not page readiness");
        slow.ready();expect(slow.state(2800)==StartupGate.CONTENT,"ready content revealed");
        StartupGate fail=new StartupGate(0);fail.failed();
        expect(fail.state(1000)==StartupGate.WAIT,"early error does not cut intro");
        expect(fail.state(2300)==StartupGate.ERROR,"error after intro");
        StartupGate hung=new StartupGate(100);
        expect(hung.state(15099)==StartupGate.WAIT,"bounded wait before timeout");
        expect(hung.state(15100)==StartupGate.ERROR,"timeout shows retry");
        hung.ready();expect(hung.state(15101)==StartupGate.ERROR,"late result must not override timed out state");
        for(long t=0;t<=2300;t+=10){
            for(int ray=0;ray<8;ray++){
                float p=IntroTimeline.ray(t,ray);
                expect(p>=0&&p<=1,"ray bounded");
                if(t>=720)expect(p==1,"rays locked before text");
            }
            expect(IntroTimeline.name(t)>=0&&IntroTimeline.name(t)<=1,"name bounded");
        }
        expect(IntroTimeline.tagline(700)==0,"tagline after rays");
        expect(IntroTimeline.tagline(1000)==1,"tagline settled");
        expect(IntroTimeline.name(1030)==0,"name after tagline");
        expect(IntroTimeline.name(1400)==1,"name settles before light");
        expect(IntroTimeline.light(1449)==0,"light waits for lock");
        expect(IntroTimeline.light(2250)==1,"light finishes inside intro");
        System.out.println("Startup/animation: "+checks+" checks passed");
    }
}
