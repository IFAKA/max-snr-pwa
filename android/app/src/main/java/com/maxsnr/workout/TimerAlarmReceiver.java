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

    @Override
    public void onReceive(Context context, Intent intent) {
        TimerNotifications.cancel(context, TimerNotifications.LIVE_ID);
        if (MainActivity.isVisible()) return;
        TimerNotifications.showAlert(
            context,
            intent.getStringExtra(EXTRA_TITLE),
            intent.getStringExtra(EXTRA_TEXT),
            intent.getBooleanExtra(EXTRA_SOUND, true)
        );
    }
}
