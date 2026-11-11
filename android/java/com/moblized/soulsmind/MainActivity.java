package com.moblized.soulsmind;

import android.app.Activity;
import android.content.Context;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;

/**
 * Hosts the game page full screen. The page and everything it needs are packed in assets/www and served
 * from a private https origin, so the game runs offline and its saves (localStorage) stay on the phone.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String ORIGIN = "https://" + HOST + "/";

    private WebView web;
    private Vibrator vibrator;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        drawUnderCameraHole(w);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);

        web = new WebView(this);
        web.setBackgroundColor(0xFF070A12);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setHapticFeedbackEnabled(false);
        web.setLongClickable(false);
        web.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) { return true; }
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100); // the game lays out its own text; ignore the system font-size setting

        web.addJavascriptInterface(new Bridge(), "RimebellApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return serve(req.getUrl());
            }

            // The String form is the one every Android version routes through.
            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !HOST.equals(Uri.parse(url).getHost()); // never navigate away from the game
            }
        });

        setContentView(web);
        web.loadUrl(ORIGIN + "index.html");
    }

    /** Serves files from assets/www for the private origin; anything else is refused. */
    private WebResourceResponse serve(Uri url) {
        if (!HOST.equals(url.getHost())) return new WebResourceResponse("text/plain", "utf-8", null);
        String path = url.getPath();
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        if (path.contains("..")) return null;
        try {
            AssetManager am = getAssets();
            InputStream in = am.open("www" + path);
            return new WebResourceResponse(mime(path), "utf-8", in);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", null);
        }
    }

    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    /** Lets the game draw beside a punch-hole camera in landscape; the page keeps its controls clear of it. */
    private static void drawUnderCameraHole(Window w) {
        if (Build.VERSION.SDK_INT < 28) return;
        try {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.getClass().getField("layoutInDisplayCutoutMode").setInt(lp, 1); // SHORT_EDGES
            w.setAttributes(lp);
        } catch (Throwable ignored) {
        }
    }

    @SuppressWarnings("deprecation")
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    private void js(String code) {
        if (web != null) web.evaluateJavascript(code, null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        immersive();
        if (web != null) {
            web.onResume();
            js("window.__rimebell && window.__rimebell.wake()");
        }
    }

    @Override
    protected void onPause() {
        // pauses the game and saves before the app leaves the screen
        js("window.__rimebell && window.__rimebell.sleep()");
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    /** Back pauses, closes menus and resumes; on the title screen it sends the app to the background. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("!!(window.__rimebell && window.__rimebell.back())", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String handled) {
                if (!"true".equals(handled)) moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("RimebellApp");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    /** Called from the page as window.RimebellApp. */
    private class Bridge {
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void buzz(int ms) {
            if (vibrator == null || ms <= 0) return;
            try {
                vibrator.vibrate(Math.min(ms, 300));
            } catch (Throwable ignored) {
            }
        }
    }
}
