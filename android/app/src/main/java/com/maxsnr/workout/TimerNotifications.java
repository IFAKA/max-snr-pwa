package com.maxsnr.workout;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * The two notifications a workout timer uses: a silent, ongoing countdown on the lock screen
 * while rest, plank or stretch runs, and an alert with sound and vibration when it ends.
 */
final class TimerNotifications {

    // Default importance (with no sound) so the countdown is not hidden with silent notifications
    // on the lock screen; importance cannot change after creation, hence the new id.
    static final String LIVE_CHANNEL = "timer-live-2";
    private static final String OLD_LIVE_CHANNEL = "timer-live";
    static final String ALERT_CHANNEL = "timer-alert";
    // Channel sounds cannot change after creation, so Sound off uses its own vibrate-only channel.
    static final String ALERT_SILENT_CHANNEL = "timer-alert-silent";
    static final int LIVE_ID = 1;
    static final int ALERT_ID = 2;
    private static final long[] VIBRATION = { 0, 300, 150, 300 };

    private TimerNotifications() {}

    static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        manager.deleteNotificationChannel(OLD_LIVE_CHANNEL);
        NotificationChannel live = new NotificationChannel(LIVE_CHANNEL, "Workout timer", NotificationManager.IMPORTANCE_DEFAULT);
        live.setDescription("The rest, plank or stretch countdown on the lock screen and status bar");
        live.setShowBadge(false);
        live.setSound(null, null);
        live.enableVibration(false);
        live.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        NotificationChannel alert = new NotificationChannel(ALERT_CHANNEL, "Timer done", NotificationManager.IMPORTANCE_HIGH);
        alert.setDescription("Sound and vibration when rest, plank or stretch ends");
        alert.enableVibration(true);
        alert.setVibrationPattern(VIBRATION);
        alert.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).build()
        );
        alert.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        NotificationChannel silent = new NotificationChannel(
            ALERT_SILENT_CHANNEL,
            "Timer done (Sound off)",
            NotificationManager.IMPORTANCE_HIGH
        );
        silent.setDescription("Vibration only, used when Sound is off in History");
        silent.enableVibration(true);
        silent.setVibrationPattern(VIBRATION);
        silent.setSound(null, null);
        silent.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        manager.createNotificationChannel(live);
        manager.createNotificationChannel(alert);
        manager.createNotificationChannel(silent);
    }

    /** Tapping either notification brings the running app back to the workout. */
    static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void showLive(Context context, long endsAt, String title, String text) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, LIVE_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_timer)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(openApp(context))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(true)
            .setWhen(endsAt)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            // Android 16 Live Update: the countdown shows as a status bar chip (the island on
            // HyperOS, the Now Bar on One UI) and at the top of the lock screen.
            .setRequestPromotedOngoing(true)
            // The countdown would run past zero; the alarm also removes it when it fires.
            .setTimeoutAfter(Math.max(0, endsAt - System.currentTimeMillis()));
        notify(context, LIVE_ID, builder);
    }

    static void showAlert(Context context, String title, String text, boolean sound) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, sound ? ALERT_CHANNEL : ALERT_SILENT_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_timer)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(openApp(context))
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setVibrate(VIBRATION);
        if (sound) builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
        notify(context, ALERT_ID, builder);
    }

    static void cancel(Context context, int id) {
        NotificationManagerCompat.from(context).cancel(id);
    }

    private static void notify(Context context, int id, NotificationCompat.Builder builder) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        // Without the notification permission (Android 13+) the timer still works in the app.
        if (!manager.areNotificationsEnabled()) return;
        try {
            manager.notify(id, builder.build());
        } catch (SecurityException ignored) {}
    }
}
