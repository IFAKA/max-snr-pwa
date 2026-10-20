package com.maxsnr.workout;

import android.app.Notification;
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
import androidx.core.graphics.drawable.IconCompat;
import java.util.Locale;

/**
 * The two notifications a workout timer uses: a silent, ongoing countdown on the lock screen
 * while rest, plank or stretch runs, and an alert with sound and vibration when it ends.
 */
final class TimerNotifications {

    // Default importance (with no sound) so the workout is not hidden with silent notifications
    // on the lock screen; importance cannot change after creation, hence the new id.
    static final String LIVE_CHANNEL = "timer-live-2";
    private static final String OLD_LIVE_CHANNEL = "timer-live";
    static final String ALERT_CHANNEL = "timer-alert";
    // Channel sounds cannot change after creation, so Sound off uses its own vibrate-only channel.
    static final String ALERT_SILENT_CHANNEL = "timer-alert-silent";
    static final int LIVE_ID = 1;
    static final int ALERT_ID = 2;
    // The app's sage accent (dark theme, as lock screens are dark), from src/styles/app.css.
    private static final int ACCENT = 0xFF8FD0A9;
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

    /**
     * The workout as a glance: during a countdown the time left leads the title and stands alone
     * in the status bar chip (the island), with a bar that empties; while lifting, the set to do.
     * The text says what comes next and the expanded view adds the finish line (exercise k of n,
     * minutes left). Buttons do what the matching on-screen buttons do.
     */
    static Notification live(Context context, LiveStatus shown, boolean confirmingSkip) {
        long now = System.currentTimeMillis();
        LiveStatus status = shown.at(now);
        long left = status.endsAt - now;
        boolean counting = left > 0;
        boolean ended = status.endsAt > 0 && !counting;
        String time = clock(Math.max(0, left));
        String title = counting ? time + " · " + status.title : ended ? status.doneTitle : status.title;
        String text = ended ? status.doneText : status.text;
        String chip = counting ? time : ended ? "Go" : status.chip;
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, LIVE_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_timer)
            .setColor(ACCENT)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(openApp(context))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(counting ? NotificationCompat.CATEGORY_STOPWATCH : NotificationCompat.CATEGORY_WORKOUT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(false)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            // Android 16 Live Update: the chip shows in the status bar (the island on HyperOS, the
            // Now Bar on One UI) and the card sits at the top of the lock screen.
            .setRequestPromotedOngoing(true);
        if (!chip.isEmpty()) builder.setShortCriticalText(chip);
        if (counting) {
            // The bar drains like the in-app countdown, in the app's sage, with a dot riding
            // its edge; the finish line moves to the header.
            int max = (int) Math.max(1, status.total / 100);
            builder
                .setSubText(status.progress)
                .setStyle(
                    new NotificationCompat.ProgressStyle()
                        .addProgressSegment(new NotificationCompat.ProgressStyle.Segment(max).setColor(ACCENT))
                        .setStyledByProgress(true)
                        .setProgressTrackerIcon(IconCompat.createWithResource(context, R.drawable.ic_progress_tracker))
                        .setProgress((int) Math.min(max, left / 100))
                );
        } else {
            String expanded = status.progress.isEmpty() ? text : text + "\n" + status.progress;
            builder.setStyle(new NotificationCompat.BigTextStyle().bigText(expanded));
        }
        boolean live = WorkoutTimerPlugin.isLive();
        for (int i = 0; i < status.actions.length; i++) {
            String action = status.actions[i];
            String label = label(action, counting, confirmingSkip);
            if (label == null) continue;
            builder.addAction(new NotificationCompat.Action.Builder(R.drawable.ic_stat_timer, label, button(context, action, i, live)).build());
        }
        return builder.build();
    }

    // With the page running, a button acts in place (the service asks it to). With the app closed
    // nothing can run it, so the button opens the app, which runs it as it loads.
    private static PendingIntent button(Context context, String action, int index, boolean live) {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        if (live) {
            Intent intent = new Intent(context, TimerService.class)
                .setAction(TimerService.ACTION_BUTTON)
                .putExtra(TimerService.EXTRA_BUTTON, action);
            return PendingIntent.getService(context, 10 + index, intent, flags);
        }
        Intent intent = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(WorkoutTimerPlugin.EXTRA_ACTION, action);
        return PendingIntent.getActivity(context, 20 + index, intent, flags);
    }

    private static String label(String action, boolean counting, boolean confirmingSkip) {
        switch (action) {
            case "log":
                return "Log set";
            case "skip":
                if (!counting) return "Start set";
                return confirmingSkip ? "Tap again to skip" : "Skip rest";
            case "next":
                return "Stretch";
            case "undo":
                return "Undo set";
            default:
                return null;
        }
    }

    static String clock(long ms) {
        long seconds = (ms + 999) / 1000;
        if (seconds >= 3600) {
            return String.format(Locale.ROOT, "%d:%02d:%02d", seconds / 3600, (seconds / 60) % 60, seconds % 60);
        }
        return String.format(Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60);
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
        // The live card already shows the next set; the alert only needs to be heard, then goes.
        builder.setTimeoutAfter(30000);
        post(context, ALERT_ID, builder.build());
    }

    static void cancel(Context context, int id) {
        NotificationManagerCompat.from(context).cancel(id);
    }

    static void post(Context context, Notification notification) {
        post(context, LIVE_ID, notification);
    }

    private static void post(Context context, int id, Notification notification) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        // Without the notification permission (Android 13+) the timer still works in the app.
        if (!manager.areNotificationsEnabled()) return;
        try {
            manager.notify(id, notification);
        } catch (SecurityException ignored) {}
    }
}
