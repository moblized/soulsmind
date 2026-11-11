package com.moblized.soulsmind;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Hosts the game page full screen. The page and everything it needs are packed in assets/www and served
 * from a private https origin, so the game runs offline and its saves (localStorage) stay on the phone.
 *
 * Updates: on launch (and when it comes back after six hours) the app asks GitHub for the latest release of
 * moblized/soulsmind. If its versionCode is higher, the game shows an update card; "Update now" downloads the
 * APK and hands it to Android's package installer, which asks the player to confirm. Saves survive the update.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String ORIGIN = "https://" + HOST + "/";

    private static final String RELEASES = "https://api.github.com/repos/moblized/soulsmind/releases/latest";
    private static final String ACTION_INSTALL_STATUS = "com.moblized.soulsmind.INSTALL_STATUS";
    private static final long RECHECK_MS = 6L * 60 * 60 * 1000;

    private WebView web;
    private Vibrator vibrator;
    private volatile String updateUrl;
    private volatile boolean updating;
    private long lastCheck;
    private boolean firstLoad = true;

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

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!firstLoad) return;
                firstLoad = false;
                view.postDelayed(new Runnable() {
                    @Override public void run() { checkForUpdate(false); }
                }, 2500);
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
        if (lastCheck > 0 && System.currentTimeMillis() - lastCheck > RECHECK_MS) checkForUpdate(false);
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

    // ---------- updates from GitHub releases ----------

    private int installedCode() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode; } catch (Exception e) { return 0; }
    }

    private String installedName() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "?"; }
    }

    /** Release notes carry "versionCode: N"; failing that, build-N tags map to 100 + N, as the workflow numbers them. */
    static int releaseCode(String notes, String tag) {
        Matcher m = Pattern.compile("versionCode:\\s*(\\d+)").matcher(notes == null ? "" : notes);
        if (m.find()) return Integer.parseInt(m.group(1));
        m = Pattern.compile("(\\d+)$").matcher(tag == null ? "" : tag);
        return m.find() ? 100 + Integer.parseInt(m.group(1)) : 0;
    }

    private void checkForUpdate(final boolean manual) {
        lastCheck = System.currentTimeMillis();
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection) new URL(RELEASES).openConnection();
                    c.setConnectTimeout(10000);
                    c.setReadTimeout(10000);
                    c.setRequestProperty("Accept", "application/vnd.github+json");
                    c.setRequestProperty("User-Agent", "SoulsMind-Android");
                    int code = c.getResponseCode();
                    if (code == 404) { if (manual) status("latest", "No releases are published yet. You have " + installedName() + "."); return; }
                    if (code != 200) { if (manual) status("error", "GitHub answered " + code + ". Try again in a while."); return; }
                    JSONObject rel = new JSONObject(readAll(c.getInputStream()));
                    String apk = null;
                    JSONArray assets = rel.optJSONArray("assets");
                    if (assets != null) for (int i = 0; i < assets.length(); i++) {
                        JSONObject a = assets.getJSONObject(i);
                        if (a.optString("name").endsWith(".apk")) apk = a.optString("browser_download_url");
                    }
                    int remote = releaseCode(rel.optString("body"), rel.optString("tag_name"));
                    Matcher m = Pattern.compile("(\\d+\\.\\d+\\.\\d+)").matcher(rel.optString("name"));
                    String version = m.find() ? m.group(1) : rel.optString("tag_name");
                    if (apk != null && remote > installedCode()) {
                        updateUrl = apk;
                        JSONObject info = new JSONObject();
                        info.put("version", version);
                        info.put("current", installedName());
                        call("appUpdate", info);
                    } else if (manual) {
                        status("latest", "You have the latest version (" + installedName() + ").");
                    }
                } catch (Exception e) {
                    if (manual) status("error", "Could not reach GitHub. Check your connection and try again.");
                } finally {
                    if (c != null) c.disconnect();
                }
            }
        }).start();
    }

    private boolean canInstallPackages() {
        if (Build.VERSION.SDK_INT < 26) return true;
        try {
            return (Boolean) PackageManager.class.getMethod("canRequestPackageInstalls").invoke(getPackageManager());
        } catch (Throwable t) {
            return true;
        }
    }

    private void openUnknownSources() {
        try {
            startActivity(new Intent("android.settings.MANAGE_UNKNOWN_APP_SOURCES", Uri.parse("package:" + getPackageName())));
        } catch (Throwable t) {
            try { startActivity(new Intent(android.provider.Settings.ACTION_SECURITY_SETTINGS)); } catch (Throwable ignored) { }
        }
    }

    /** Downloads the release APK and hands it to the system installer, which asks the player to confirm. */
    private void startUpdate() {
        if (updating || updateUrl == null) return;
        if (!canInstallPackages()) {
            status("permission", "Android needs your OK first. Turn on \"Allow from this source\" for Souls Mind, come back, and tap Update now.");
            return;
        }
        updating = true;
        js("window.__rimebell && window.__rimebell.sleep()"); // saves the journey
        final String url = updateUrl;
        new Thread(new Runnable() {
            @Override
            public void run() {
                File apk = new File(getCacheDir(), "update.apk");
                try {
                    download(url, apk);
                    status("installing", "Confirm the update in the Android prompt. The game closes to install it; your progress is kept.");
                    PackageInstaller installer = getPackageManager().getPackageInstaller();
                    PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                    params.setAppPackageName(getPackageName());
                    params.setSize(apk.length());
                    PackageInstaller.Session session = installer.openSession(installer.createSession(params));
                    InputStream in = new FileInputStream(apk);
                    OutputStream out = session.openWrite("soulsmind.apk", 0, apk.length());
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    session.fsync(out);
                    out.close();
                    in.close();
                    Intent back = new Intent(MainActivity.this, MainActivity.class).setAction(ACTION_INSTALL_STATUS);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? 0x02000000 : 0); // FLAG_MUTABLE: the installer fills in the result
                    session.commit(PendingIntent.getActivity(MainActivity.this, 31, back, flags).getIntentSender());
                    session.close();
                } catch (Exception e) {
                    status("error", "The update could not be installed (" + e.getMessage() + "). Try again, or install it from the Releases page.");
                } finally {
                    updating = false;
                }
            }
        }).start();
    }

    private void download(String url, File dest) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection(); // GitHub redirects to its file host
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setRequestProperty("User-Agent", "SoulsMind-Android");
        int code = c.getResponseCode();
        if (code != 200) throw new IOException("download answered " + code);
        long total = c.getContentLength(), got = 0;
        InputStream in = c.getInputStream();
        OutputStream out = new FileOutputStream(dest);
        byte[] buf = new byte[16384];
        int n, last = -1;
        try {
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                got += n;
                if (total > 0) {
                    int pct = (int) (got * 100 / total);
                    if (pct >= last + 5 || pct == 100) { last = pct; call("updateProgress", pct); }
                }
            }
        } finally {
            out.close();
            in.close();
            c.disconnect();
        }
        if (got < 10000) throw new IOException("the download was incomplete");
    }

    /** The system installer reports back here: ask for confirmation, or tell the player what happened. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent == null || !ACTION_INSTALL_STATUS.equals(intent.getAction())) return;
        int st = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (st == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                try { startActivity(confirm); } catch (Exception e) { status("error", "Android could not show the install prompt."); }
            }
        } else if (st == PackageInstaller.STATUS_FAILURE_ABORTED) {
            status("cancelled", "Update cancelled. You can install it any time from the pause menu.");
        } else if (st != PackageInstaller.STATUS_SUCCESS) {
            String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            status("error", "The update failed" + (msg != null ? " (" + msg + ")" : "") + ".");
        }
    }

    private static String readAll(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        in.close();
        return b.toString("UTF-8");
    }

    /** Calls window.__rimebell.fn(arg) on the UI thread. */
    private void call(String fn, Object arg) {
        final String code = "window.__rimebell && window.__rimebell." + fn + "(" + (arg instanceof String ? JSONObject.quote((String) arg) : String.valueOf(arg)) + ")";
        runOnUiThread(new Runnable() {
            @Override public void run() { js(code); }
        });
    }

    private void status(String kind, String text) {
        try {
            JSONObject o = new JSONObject();
            o.put("kind", kind);
            o.put("text", text);
            call("updateStatus", o);
        } catch (Exception ignored) {
        }
    }

    /** Called from the page as window.RimebellApp. */
    private class Bridge {
        @JavascriptInterface
        public String appVersion() { return installedName(); }

        @JavascriptInterface
        public void checkUpdate() { checkForUpdate(true); }

        @JavascriptInterface
        public void installUpdate() {
            runOnUiThread(new Runnable() { @Override public void run() { startUpdate(); } });
        }

        @JavascriptInterface
        public void openInstallSettings() {
            runOnUiThread(new Runnable() { @Override public void run() { openUnknownSources(); } });
        }

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
