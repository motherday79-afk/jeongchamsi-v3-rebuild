package com.jeongchamsi.preview;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Objects;

/** Error callbacks also arrive for images and abandoned navigations. */
public final class DocumentFailure {
    private DocumentFailure() {}
    public static boolean affectsPage(boolean mainFrame,String requested,String current){
        return mainFrame && sameDocument(requested,current);
    }
    public static boolean sameDocument(String first,String second){
        if(first==null || second==null)return false;
        try {
            URI a=new URI(first),b=new URI(second);
            if(a.getHost()==null || b.getHost()==null)return false;
            return "https".equalsIgnoreCase(a.getScheme()) && "https".equalsIgnoreCase(b.getScheme())
                && a.getHost().equalsIgnoreCase(b.getHost())
                && port(a)==port(b) && path(a).equals(path(b))
                && Objects.equals(a.getRawQuery(),b.getRawQuery());
        }catch(URISyntaxException error){return false;}
    }
    private static int port(URI uri){return uri.getPort()==-1?443:uri.getPort();}
    private static String path(URI uri){String path=uri.getRawPath();return path==null||path.isEmpty()?"/":path;}
}
