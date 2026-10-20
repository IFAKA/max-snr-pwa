package com.maxsnr.workout;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Closes the top open <dialog> (or a confirmation drawer, with Escape) as a cancel, like Chrome's back gesture does on the web.
    private static final String CLOSE_DIALOG_JS =
        "(() => { const dialog = [...document.querySelectorAll('dialog[open]')].pop();" +
        " if (!dialog) {" +
        "   if (!document.querySelector('[data-confirm-drawer]')) return false;" +
        "   document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));" +
        "   return true; }" +
        " if (dialog.requestClose) dialog.requestClose();" +
        " else if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();" +
        " return true; })()";

    // Whether the app is on screen, so a timer alarm knows the app will cue the end itself.
    private static volatile boolean visible = false;

    static boolean isVisible() {
        return visible;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WorkoutTimerPlugin.class);
        registerPlugin(BackupFilePlugin.class);
        super.onCreate(savedInstanceState);
        // Keep the page's renderer as important as the app (a foreground service during a
        // workout), so the system does not freeze it in the background and notification buttons
        // run at once instead of when the app is next opened.
        getBridge().getWebView().setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        WorkoutTimerPlugin.fromIntent(getIntent());
        keepInsideSystemBars();
        getOnBackPressedDispatcher().addCallback(this, backThroughHistory);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        WorkoutTimerPlugin.fromIntent(intent);
    }

    /**
     * Android 15+ draws apps under the status and navigation bars. Pad the window by the bars
     * (and the keyboard) so no control sits under them; the padding shows the window background,
     * which matches the app's light or dark background.
     */
    private void keepInsideSystemBars() {
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
    }

    /**
     * Back behaves as in the browser: it closes an open dialog first, then goes back through the
     * app's history (so the workout's own back guard still runs), and leaves the app only from
     * the first screen.
     */
    private final OnBackPressedCallback backThroughHistory = new OnBackPressedCallback(true) {
        @Override
        public void handleOnBackPressed() {
            WebView webView = getBridge().getWebView();
            webView.evaluateJavascript(CLOSE_DIALOG_JS, (closed) -> {
                if ("true".equals(closed)) return;
                if (webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            });
        }
    };

    @Override
    public void onStart() {
        super.onStart();
        visible = true;
    }

    @Override
    public void onResume() {
        super.onResume();
        // Back in the app: the "done" alert has been seen and the app has moved on.
        TimerNotifications.cancel(this, TimerNotifications.ALERT_ID);
    }

    @Override
    public void onStop() {
        visible = false;
        super.onStop();
    }
}
