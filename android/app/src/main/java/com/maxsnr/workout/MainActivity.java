package com.maxsnr.workout;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

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
    }

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
