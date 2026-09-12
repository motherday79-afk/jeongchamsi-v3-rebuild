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

/** The only native screen: the existing website and the original intro. */
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
    private boolean backPending;
    private boolean destroyed;
    private int backRequest;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);
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
        web.setOnTouchListener((view, event) -> {
            if (event.getActionMasked() == MotionEvent.ACTION_DOWN) resetExit();
            return false;
        });
        closeLayerScript = readAsset("back-layer.js");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return routeExternal(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return routeExternal(Uri.parse(url));
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                resetExit(); removeError();
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) {
                // Includes history.pushState/popstate used by the actual JCS router.
                resetExit();
            }
            @Override public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError(request.getUrl().toString());
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler ssl, SslError error) {
                ssl.cancel(); // Never bypass HTTPS certificate failures.
                showError(view.getUrl());
            }
        });
        if (Build.VERSION.SDK_INT >= 33) unregisterBack = Api33.register(this, this::handleBack);
        boolean restored = state != null && web.restoreState(state) != null;
        if (!restored) web.loadUrl(BuildConfig.HOME_URL);
        if (state == null) showOriginalIntro();
        root.requestApplyInsets();
    }

    private void showOriginalIntro() {
        // This class is the original compiled animation, NOT the compile-only stub.
        intro = new IntroView(this);
        root.addView(intro, new FrameLayout.LayoutParams(-1, -1));
        intro.setOnFinished(() -> handler.post(() -> {
            if (!destroyed && intro != null) {
                root.removeView(intro);
                intro = null;
            }
        }));
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
        if (trusted(uri)) return false;
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

    private void showError(String url) {
        if (destroyed) return;
        if (url != null && trusted(Uri.parse(url))) failedUrl = url;
        removeError();
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(Color.WHITE);
        int padding = (int)(getResources().getDisplayMetrics().density * 24);
        box.setPadding(padding, padding, padding, padding);
        TextView message = new TextView(this);
        message.setText("정참시를 불러오지 못했습니다.\n인터넷 연결과 사이트 상태를 확인해 주세요.");
        message.setTextColor(Color.DKGRAY); message.setTextSize(16); message.setGravity(Gravity.CENTER);
        box.addView(message);
        Button retry = new Button(this); retry.setText("다시 시도");
        retry.setOnClickListener(view -> { removeError(); web.loadUrl(failedUrl); });
        box.addView(retry);
        errorPanel = box;
        root.addView(box, new FrameLayout.LayoutParams(-1, -1));
        if (intro != null) intro.bringToFront();
    }

    private void removeError() {
        if (errorPanel != null) { root.removeView(errorPanel); errorPanel = null; }
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
