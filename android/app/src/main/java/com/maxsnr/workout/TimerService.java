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
 * Keeps the running countdown live outside the app: a foreground service, so the system does not
 * freeze it, that redraws the notification as each second passes. Some launchers (HyperOS) never
 * tick a notification chronometer, so the time is written out instead.
 */
public class TimerService extends Service {

    private static final String EXTRA_ENDS_AT = "endsAt";
    private static final String EXTRA_TOTAL = "total";
    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_TEXT = "text";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable tick = this::tick;
    private long endsAt;
    private long total;
    private String title;
    private String text;

    static void start(Context context, long endsAt, long total, String title, String text) {
        Intent intent = new Intent(context, TimerService.class)
            .putExtra(EXTRA_ENDS_AT, endsAt)
            .putExtra(EXTRA_TOTAL, total)
            .putExtra(EXTRA_TITLE, title)
            .putExtra(EXTRA_TEXT, text);
        try {
            ContextCompat.startForegroundService(context, intent);
        } catch (RuntimeException notAllowed) {
            // Started from the background (Android 12+): show the countdown without live updates.
            TimerNotifications.post(context, TimerNotifications.live(context, endsAt, total, title, text));
        }
    }

    static void stop(Context context) {
        context.stopService(new Intent(context, TimerService.class));
        TimerNotifications.cancel(context, TimerNotifications.LIVE_ID);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        endsAt = intent.getLongExtra(EXTRA_ENDS_AT, 0);
        // Without a known length the bar measures from now, fixed once so it still empties.
        total = intent.getLongExtra(EXTRA_TOTAL, 0);
        if (total <= 0) total = Math.max(1000, endsAt - System.currentTimeMillis());
        title = intent.getStringExtra(EXTRA_TITLE);
        text = intent.getStringExtra(EXTRA_TEXT);
        Notification notification = TimerNotifications.live(this, endsAt, total, title, text);
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0;
        try {
            ServiceCompat.startForeground(this, TimerNotifications.LIVE_ID, notification, type);
        } catch (RuntimeException notAllowed) {
            TimerNotifications.post(this, notification);
            stopSelf();
            return START_NOT_STICKY;
        }
        handler.removeCallbacks(tick);
        scheduleTick();
        return START_NOT_STICKY;
    }

    private void tick() {
        if (endsAt - System.currentTimeMillis() <= 0) {
            stopSelf();
            return;
        }
        TimerNotifications.post(this, TimerNotifications.live(this, endsAt, total, title, text));
        scheduleTick();
    }

    // Redraw just after the shown second changes, so the time never lags the in-app countdown.
    private void scheduleTick() {
        long left = endsAt - System.currentTimeMillis();
        long untilNextSecond = left % 1000;
        handler.postDelayed(tick, (untilNextSecond == 0 ? 1000 : untilNextSecond) + 5);
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(tick);
        NotificationManagerCompat.from(this).cancel(TimerNotifications.LIVE_ID);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
