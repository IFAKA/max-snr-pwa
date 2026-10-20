package com.maxsnr.workout;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * The native half of src/lib/browser/native-timer.ts: mirrors the running rest, plank or stretch
 * timer as a lock-screen countdown and an exact alarm at its end time.
 */
@CapacitorPlugin(
    name = "WorkoutTimer",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class WorkoutTimerPlugin extends Plugin {

    @Override
    public void load() {
        TimerNotifications.createChannels(getContext());
    }

    @PluginMethod
    public void start(PluginCall call) {
        Long endsAt = call.getLong("endsAt");
        if (endsAt == null) {
            call.reject("endsAt is required");
            return;
        }
        Context context = getContext();
        TimerNotifications.cancel(context, TimerNotifications.ALERT_ID);
        TimerService.start(
            context,
            endsAt,
            call.getLong("total", 0L),
            call.getString("title", "Workout"),
            call.getString("text", "")
        );

        Intent intent = new Intent(context, TimerAlarmReceiver.class)
            .putExtra(TimerAlarmReceiver.EXTRA_TITLE, call.getString("doneTitle", "Time's up"))
            .putExtra(TimerAlarmReceiver.EXTRA_TEXT, call.getString("doneText", ""))
            .putExtra(TimerAlarmReceiver.EXTRA_SOUND, call.getBoolean("sound", true));
        schedule(context, endsAt, alarmIntent(context, intent));
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context context = getContext();
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        alarms.cancel(alarmIntent(context, new Intent(context, TimerAlarmReceiver.class)));
        TimerService.stop(context);
        // A "done" alert that already rang stays until the app is opened (MainActivity.onResume):
        // a backgrounded page may still run and move on to the next set by itself.
        call.resolve();
    }

    @Override
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationsCallback");
        } else {
            notificationsCallback(call);
        }
    }

    @PermissionCallback
    private void notificationsCallback(PluginCall call) {
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("notifications") == PermissionState.GRANTED;
        JSObject result = new JSObject();
        result.put("notifications", granted ? "granted" : "denied");
        call.resolve(result);
    }

    private static PendingIntent alarmIntent(Context context, Intent intent) {
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /**
     * An alarm clock is exempt from Doze, so it rings on time in a pocket. Without exact-alarm
     * access it falls back to an inexact alarm that may arrive a little late.
     */
    private static void schedule(Context context, long endsAt, PendingIntent operation) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
        if (exact) {
            alarms.setAlarmClock(new AlarmManager.AlarmClockInfo(endsAt, TimerNotifications.openApp(context)), operation);
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endsAt, operation);
        }
    }
}
