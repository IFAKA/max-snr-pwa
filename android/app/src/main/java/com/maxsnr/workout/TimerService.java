package com.maxsnr.workout;

import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

/**
 * Keeps the workout live outside the app for as long as it runs: a foreground service, so the
 * system does not freeze it, that redraws the notification as each second of a countdown passes
 * (some launchers, like HyperOS, never tick a notification chronometer) and takes its buttons.
 * Skip rest cannot be undone, so it asks for a second tap first.
 */
public class TimerService extends Service {

    static final String ACTION_BUTTON = "com.maxsnr.workout.BUTTON";
    static final String EXTRA_BUTTON = "button";
    private static final String ACTION_REFRESH = "com.maxsnr.workout.REFRESH";
    private static final long CONFIRM_MS = 4000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable tick = this::tick;
    private final Runnable redraw = this::redraw;
    private LiveStatus status;
    private long confirmSkipUntil;

    static void start(Context context, LiveStatus status) {
        Intent intent = status.into(new Intent(context, TimerService.class));
        try {
            ContextCompat.startForegroundService(context, intent);
        } catch (RuntimeException notAllowed) {
            // Started from the background (Android 12+): show the status without live updates.
            TimerNotifications.post(context, TimerNotifications.live(context, status, false));
        }
    }

    /** Redraws the buttons, e.g. when the page goes away and they must open the app instead. */
    static void refresh(Context context) {
        try {
            context.startService(new Intent(context, TimerService.class).setAction(ACTION_REFRESH));
        } catch (RuntimeException notRunning) {
            // Nothing is shown, so nothing to redraw.
        }
    }

    static void stop(Context context) {
        context.stopService(new Intent(context, TimerService.class));
        TimerNotifications.cancel(context, TimerNotifications.LIVE_ID);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_BUTTON.equals(intent.getAction())) {
            press(intent.getStringExtra(EXTRA_BUTTON));
            return START_NOT_STICKY;
        }
        if (intent != null && ACTION_REFRESH.equals(intent.getAction())) {
            if (status == null) stopSelf();
            else redraw();
            return START_NOT_STICKY;
        }
        LiveStatus next = intent == null ? null : LiveStatus.from(intent);
        if (next == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (status == null || status.endsAt != next.endsAt) confirmSkipUntil = 0;
        status = next;
        Notification notification = TimerNotifications.live(this, status, confirming());
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0;
        try {
            ServiceCompat.startForeground(this, TimerNotifications.LIVE_ID, notification, type);
        } catch (RuntimeException notAllowed) {
            TimerNotifications.post(this, notification);
            stopSelf();
            return START_NOT_STICKY;
        }
        handler.removeCallbacks(tick);
        if (counting()) scheduleTick();
        return START_NOT_STICKY;
    }

    private void press(String button) {
        if (status == null || button == null) return;
        if ("skip".equals(button) && counting() && !confirming()) {
            confirmSkipUntil = System.currentTimeMillis() + CONFIRM_MS;
            redraw();
            handler.postDelayed(redraw, CONFIRM_MS + 50);
            return;
        }
        confirmSkipUntil = 0;
        // Once rest is over, skipping it is just starting the next set.
        WorkoutTimerPlugin.dispatch(button);
    }

    private boolean counting() {
        return status != null && status.at(System.currentTimeMillis()).endsAt > System.currentTimeMillis();
    }

    private boolean confirming() {
        return confirmSkipUntil > System.currentTimeMillis();
    }

    private void redraw() {
        if (status != null) TimerNotifications.post(this, TimerNotifications.live(this, status, confirming()));
    }

    private void tick() {
        redraw();
        // The last redraw, at zero, shows what comes next (the next set with Log set).
        if (counting()) scheduleTick();
    }

    // One redraw a second, just after the shown second changes, so the time never lags the
    // in-app countdown. Every redraw makes the system re-inflate the card, the island and the
    // lock screen; more often than this (we tried four a second for a smoother bar) makes them
    // lag badly when opened.
    private void scheduleTick() {
        long left = status.at(System.currentTimeMillis()).endsAt - System.currentTimeMillis();
        long untilNextSecond = left % 1000;
        handler.postDelayed(tick, (untilNextSecond <= 0 ? 1000 : untilNextSecond) + 5);
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        NotificationManagerCompat.from(this).cancel(TimerNotifications.LIVE_ID);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
