package com.maxsnr.workout;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Fires when a workout timer ends, even with the screen locked and the web app suspended. The
 * countdown notification goes away; the alert sounds only when the app is not on screen, because
 * an open app plays its own cue and moves on by itself.
 */
public class TimerAlarmReceiver extends BroadcastReceiver {

    static final String EXTRA_TITLE = "title";
    static final String EXTRA_TEXT = "text";
    static final String EXTRA_SOUND = "sound";
    static final String EXTRA_ENDS_AT = "endsAt";

    // The countdown last rung for, so the alarm and the page moving on never ring twice.
    private static long rungFor = 0;

    @Override
    public void onReceive(Context context, Intent intent) {
        ring(
            context,
            intent.getLongExtra(EXTRA_ENDS_AT, 0),
            intent.getStringExtra(EXTRA_TITLE),
            intent.getStringExtra(EXTRA_TEXT),
            intent.getBooleanExtra(EXTRA_SOUND, true)
        );
    }

    /** The "done" alert (sound and vibration), once per countdown, unless the app is on screen. */
    static synchronized void ring(Context context, long endsAt, String title, String text, boolean sound) {
        if (endsAt != 0 && endsAt == rungFor) return;
        rungFor = endsAt;
        if (MainActivity.isVisible()) return;
        TimerNotifications.showAlert(context, title, text, sound);
    }
}
