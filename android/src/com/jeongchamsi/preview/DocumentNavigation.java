package com.jeongchamsi.preview;

import java.util.LinkedHashMap;
import java.util.Map;

/** HTTP errors may arrive before WebView's commit-time onPageStarted callback. */
public final class DocumentNavigation {
    private String current,expected;
    private final Map<String,String> earlyErrors=new LinkedHashMap<>();
    public DocumentNavigation(String home){expect(home);}
    public void expect(String url){expected=url;earlyErrors.clear();}
    public boolean awaitingStart(){return expected!=null;}
    public boolean matches(String url){return DocumentFailure.sameDocument(url,expected!=null?expected:current);}
    public boolean error(boolean mainFrame,String url,String code){
        if(!mainFrame || url==null)return false;
        // An unannounced renderer navigation is staged, never shown on the old page.
        earlyErrors.put(url,code);
        if(earlyErrors.size()>8){
            // Bound staged errors but retain a known destination's failure.
            String drop=null;
            for(String key:earlyErrors.keySet())if(!matches(key)){drop=key;break;}
            if(drop==null)drop=earlyErrors.keySet().iterator().next();
            earlyErrors.remove(drop);
        }
        return matches(url);
    }
    public String started(String url){
        String code="";
        for(Map.Entry<String,String> entry:earlyErrors.entrySet())
            if(DocumentFailure.sameDocument(url,entry.getKey()))code=entry.getValue();
        current=url;expected=null;earlyErrors.clear();
        return code;
    }
    public void finished(String url){
        if(expected==null && DocumentFailure.sameDocument(url,current))earlyErrors.clear();
    }
}
