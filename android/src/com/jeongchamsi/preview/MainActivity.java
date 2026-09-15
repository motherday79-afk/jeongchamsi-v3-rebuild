package com.jeongchamsi.preview;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** The only native screen: the existing website and the approved purple/gold intro. */
public final class MainActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final BackPolicy backPolicy = new BackPolicy(2000);
    private WebView web;
    private FrameLayout root;
    private IntroView intro;
    private View errorPanel;
    private Toast exitToast;
    private Runnable unregisterBack;
    private String closeLayerScript = "false";
    private String failedUrl = BuildConfig.HOME_URL;
    private final DocumentNavigation documents=new DocumentNavigation(BuildConfig.HOME_URL);
    private String failureCode = "";
    private String shownStatus = "";
    private boolean backPending;
    private boolean destroyed;
    private StartupGate startup;
    private String readyScript="false";
    private boolean startupProbePending, introClosing;
    private int startupEpoch;
    private final Runnable startupTick=this::checkStartup;
    private int backRequest;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        root.setBackgroundColor(IntroView.BACKGROUND);
        // Protect the website from status bars, display cutouts and the keyboard.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        setContentView(root);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        web.setBackgroundColor(Color.WHITE);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setSupportMultipleWindows(false);
        web.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
        web.getSettings().setMediaPlaybackRequiresUserGesture(true);
        web.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.setWebChromeClient(new WebChromeClient());
        web.getSettings().setUserAgentString(web.getSettings().getUserAgentString()+" JCSAndroid/1.1.168");
        web.setOnTouchListener((view, event) -> {
            // System Back can begin in this WebView, then cancel its touch
            // stream when the OS claims the edge gesture. ACTION_DOWN must not
            // erase the first Back. Reset only after a completed content touch.
            if (event.getActionMasked() == MotionEvent.ACTION_UP) resetExit();
            return false;
        });
        closeLayerScript = readAsset("back-layer.js");
        readyScript = readAsset("startup-ready.js");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return routeExternal(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return routeExternal(Uri.parse(url));
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                resetExit(); removeError(); startupEpoch++; startupProbePending=false;
                String earlyFailure=documents.started(url);failureCode="";
                if(startup!=null){
                    startup.navigating(SystemClock.uptimeMillis());
                    if(intro==null || introClosing)showLoadStatus("LOADING");
                    scheduleStartupCheck();
                }
                if(trusted(Uri.parse(url)))failedUrl=url;
                if(!earlyFailure.isEmpty())startupError(url,earlyFailure);
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) {
                // Includes history.pushState/popstate used by the actual JCS router.
                resetExit();
            }
            @Override public void onPageFinished(WebView view, String url) {
                documents.finished(url);
                CookieManager.getInstance().flush();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                documentError(request,"NETWORK_"+error.getErrorCode());
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse response) {
                if(response.getStatusCode()>=400)documentError(request,"HTTP_"+response.getStatusCode());
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler ssl, SslError error) {
                ssl.cancel(); // Never bypass HTTPS certificate failures.
                // This callback also reports failed images and other subresources.
                if(documents.matches(error.getUrl())){
                    String code="SSL_"+error.getPrimaryError();
                    documents.error(true,error.getUrl(),code);startupError(error.getUrl(),code);
                }
            }
        });
        if (Build.VERSION.SDK_INT >= 33) unregisterBack = Api33.register(this, this::handleBack);
        boolean restored = state != null && web.restoreState(state) != null;
        if (state == null) showBrandedIntro();
        else contentSystemBars();
        if (!restored) web.loadUrl(BuildConfig.HOME_URL);
        root.requestApplyInsets();
    }

    private void showBrandedIntro() {
        long started=SystemClock.uptimeMillis();
        startup=new StartupGate(started);
        intro=new IntroView(this,started);
        root.addView(intro,new FrameLayout.LayoutParams(-1,-1));
        handler.post(startupTick);
    }

    private void checkStartup() {
        if(destroyed || startup==null)return;
        int state=startup.state(SystemClock.uptimeMillis());
        if(state==StartupGate.ERROR){showLoadStatus(failureCode);finishIntro();return;}
        if(state==StartupGate.CONTENT){
            removeError();startup=null;handler.removeCallbacks(startupTick);finishIntro();return;
        }
        if(state==StartupGate.SLOW){showLoadStatus("SCREEN_WAIT");finishIntro();}
        else if(intro!=null)intro.showWaiting();
        // A slow page remains observable after the intro disappears. No timeout latch.
        handler.postDelayed(startupTick,state==StartupGate.SLOW?1000:250);
        String current=web.getUrl();
        if(documents.awaitingStart() || startupProbePending || current==null || !trusted(Uri.parse(current)))return;
        startupProbePending=true;
        final int epoch=startupEpoch;
        final StartupGate gate=startup;
        web.evaluateJavascript(readyScript,result -> {
            if(destroyed || epoch!=startupEpoch || gate!=startup)return;
            if(!"true".equals(result)){startupProbePending=false;return;}
            // DOM-ready can precede a painted frame; wait for WebView's drawing fence.
            web.postVisualStateCallback(epoch,new WebView.VisualStateCallback(){
                @Override public void onComplete(long requestId){
                    if(!destroyed && epoch==startupEpoch && gate==startup){
                        startupProbePending=false;gate.ready();scheduleStartupCheck();
                    }
                }
            });
        });
    }

    private void scheduleStartupCheck(){
        handler.removeCallbacks(startupTick);
        if(!destroyed && startup!=null)handler.post(startupTick);
    }

    private void documentError(WebResourceRequest request,String code){
        if(documents.error(request.isForMainFrame(),request.getUrl().toString(),code))
            startupError(request.getUrl().toString(),code);
    }

    private void startupError(String url,String code){
        if(url!=null && trusted(Uri.parse(url)))failedUrl=url;
        failureCode=code;
        // Keep diagnostics free of URL paths, query strings, cookies or page text.
        Log.w("JCSLoad",code);
        if(startup==null)startup=new StartupGate(SystemClock.uptimeMillis(),false);
        startup.failed();scheduleStartupCheck();
    }

    private void retryLoading(){
        if(destroyed)return;
        web.stopLoading();
        startupEpoch++;startupProbePending=false;failureCode="";
        documents.expect(failedUrl);
        startup=new StartupGate(SystemClock.uptimeMillis(),false);
        showLoadStatus("LOADING");scheduleStartupCheck();
        web.loadUrl(failedUrl);
    }

    private void finishIntro(){
        if(intro==null || introClosing)return;
        introClosing=true;
        intro.animate().alpha(0f).setDuration(180).withEndAction(() -> {
            if(destroyed)return;
            if(intro!=null){root.removeView(intro);intro=null;}
            introClosing=false;contentSystemBars();
        }).start();
    }

    private void contentSystemBars(){
        root.setBackgroundColor(Color.WHITE);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        View decor=getWindow().getDecorView();
        decor.setSystemUiVisibility(decor.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    }

    private boolean trusted(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        String host = uri.getHost();
        if (host == null) return false;
        host = host.toLowerCase(Locale.ROOT);
        return host.equals(Uri.parse(BuildConfig.HOME_URL).getHost())
                || host.equals("www.jeongchamsi.com") || host.equals("jeongchamsi.com");
    }

    private boolean routeExternal(Uri uri) {
        if (trusted(uri)) {
            // Fragment-only jumps do not start a new document.
            if(!DocumentFailure.sameDocument(uri.toString(),web.getUrl())){
                startupEpoch++;startupProbePending=false;failureCode="";
                documents.expect(uri.toString());
                if(startup!=null){startup.navigating(SystemClock.uptimeMillis());scheduleStartupCheck();}
            }
            return false;
        }
        String scheme = uri.getScheme();
        // Only standard navigation, not arbitrary intent/file/javascript execution.
        if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)
                || "mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme)) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
            catch (ActivityNotFoundException e) {
                Toast.makeText(this, "이 링크를 열 수 있는 앱이 없습니다.", Toast.LENGTH_SHORT).show();
            }
        }
        return true;
    }

    @Override public void onBackPressed() { handleBack(); }

    private void handleBack() {
        if (destroyed || backPending) return;
        if (intro != null || !trusted(Uri.parse(web.getUrl() == null ? "" : web.getUrl()))) {
            nativeBack(); return;
        }
        backPending = true;
        int request = ++backRequest;
        Runnable fallback = () -> {
            if (!destroyed && backPending && request == backRequest) {
                backPending = false; nativeBack();
            }
        };
        handler.postDelayed(fallback, 1200);
        web.evaluateJavascript(closeLayerScript, value -> {
            if (destroyed || !backPending || request != backRequest) return;
            handler.removeCallbacks(fallback);
            backPending = false;
            if ("true".equals(value)) { resetExit(); return; }
            nativeBack();
        });
    }

    private void nativeBack() {
        if (destroyed) return;
        if (web.canGoBack()) {
            resetExit(); removeError();
            // Do NOT load the home URL or reload the page. goBack dispatches the
            // existing site's popstate handler, restoring its DOM and x/y snapshot.
            web.goBack();
            return;
        }
        if (backPolicy.shouldExit(SystemClock.uptimeMillis())) {
            if (exitToast != null) exitToast.cancel();
            finishAndRemoveTask();
        } else {
            if (exitToast != null) exitToast.cancel();
            exitToast = Toast.makeText(this, "한 번 더 누르면 정참시를 종료합니다.", Toast.LENGTH_SHORT);
            exitToast.show();
        }
    }

    private void resetExit() {
        backPolicy.reset();
        if (exitToast != null) exitToast.cancel();
    }

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[2048];
            int n;
            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } catch (java.io.IOException e) { return "false"; }
    }

    private void showLoadStatus(String code) {
        if (destroyed) return;
        if(errorPanel!=null && code.equals(shownStatus))return;
        removeError();
        shownStatus=code;
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(Color.WHITE);
        int padding = (int)(getResources().getDisplayMetrics().density * 24);
        box.setPadding(padding, padding, padding, padding);
        TextView message = new TextView(this);
        boolean waiting=code.equals("SCREEN_WAIT") || code.equals("LOADING");
        message.setText(waiting
            ? code.equals("LOADING") ? "정참시를 불러오고 있습니다." : "정참시 화면을 준비하고 있습니다.\n연결이 지연되어 계속 불러오는 중입니다."
            : code.startsWith("SSL_")
                ? "정참시의 보안 연결을 확인하지 못했습니다.\n잠시 후 다시 시도해 주세요."
                : "정참시 사이트를 불러오지 못했습니다.\n다시 시도하거나 브라우저에서 확인해 주세요.");
        message.setTextColor(Color.DKGRAY); message.setTextSize(16); message.setGravity(Gravity.CENTER);
        box.addView(message);
        Button retry = new Button(this); retry.setText("다시 시도");
        retry.setOnClickListener(view -> retryLoading());
        box.addView(retry);
        Button browser=new Button(this);browser.setText("브라우저에서 확인");
        browser.setOnClickListener(view -> {
            try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(failedUrl)));}
            catch(ActivityNotFoundException error){Toast.makeText(this,"열 수 있는 브라우저가 없습니다.",Toast.LENGTH_SHORT).show();}
        });
        box.addView(browser);
        TextView detail=new TextView(this);
        detail.setText("앱 1.1.168 · "+code);
        detail.setTextColor(Color.GRAY);detail.setTextSize(12);detail.setGravity(Gravity.CENTER);
        box.addView(detail);
        errorPanel = box;
        root.addView(box, new FrameLayout.LayoutParams(-1, -1));
        if (intro != null) intro.bringToFront();
    }

    private void removeError() {
        if (errorPanel != null) { root.removeView(errorPanel); errorPanel = null; }
        shownStatus="";
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state); web.saveState(state);
    }
    @Override protected void onPause() {
        super.onPause(); resetExit(); web.onPause(); CookieManager.getInstance().flush();
    }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        destroyed = true; handler.removeCallbacksAndMessages(null);
        if(intro!=null)intro.animate().cancel();
        if (unregisterBack != null) unregisterBack.run();
        if (exitToast != null) exitToast.cancel();
        if (web != null) { root.removeView(web); web.stopLoading(); web.destroy(); }
        super.onDestroy();
    }

    @TargetApi(33)
    private static final class Api33 {
        static Runnable register(Activity activity, Runnable back) {
            android.window.OnBackInvokedCallback callback = back::run;
            activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
            return () -> activity.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(callback);
        }
    }
}
