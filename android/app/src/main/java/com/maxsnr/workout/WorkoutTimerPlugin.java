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
import java.util.ArrayList;
import java.util.List;

/**
 * The native half of src/lib/browser/native-app.ts: keeps the running workout as a lock-screen and
 * status bar notification with buttons, and rings an exact alarm when a countdown ends.
 */
@CapacitorPlugin(
    name = "WorkoutTimer",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class WorkoutTimerPlugin extends Plugin {

    private static WorkoutTimerPlugin instance;

    // Taps made while no page was there to run them (the app was closed), run once it loads.
    private static final List<String> pending = new ArrayList<>();
    static final String EXTRA_ACTION = "notificationAction";

    @Override
    public void load() {
        instance = this;
        TimerNotifications.createChannels(getContext());
        for (String action : pending) dispatch(action);
        pending.clear();
        TimerService.refresh(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        TimerService.refresh(getContext());
    }

    /** Whether a page is there to run a button; if not, buttons open the app with the action. */
    static boolean isLive() {
        return instance != null;
    }

    /** A button that opened the app (see isLive) runs once the page listens. */
    static void fromIntent(Intent intent) {
        String action = intent == null ? null : intent.getStringExtra(EXTRA_ACTION);
        if (action == null) return;
        intent.removeExtra(EXTRA_ACTION);
        dispatch(action);
    }

    /** A notification button: the page runs it like the on-screen button (see onNativeAction). */
    static void dispatch(String action) {
        if (instance == null) {
            pending.add(action);
            return;
        }
        JSObject data = new JSObject();
        data.put("action", action);
        // Retained until a listener exists, so a tap while the page is still loading is not lost.
        instance.notifyListeners("action", data, true);
    }

    @PluginMethod
    public void start(PluginCall call) {
        Context context = getContext();
        LiveStatus status = new LiveStatus(call.getData(), System.currentTimeMillis());
        TimerNotifications.cancel(context, TimerNotifications.ALERT_ID);
        TimerService.start(context, status);

        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        Intent intent = new Intent(context, TimerAlarmReceiver.class)
            .putExtra(TimerAlarmReceiver.EXTRA_TITLE, status.doneTitle)
            .putExtra(TimerAlarmReceiver.EXTRA_TEXT, status.doneText)
            .putExtra(TimerAlarmReceiver.EXTRA_SOUND, call.getBoolean("sound", true));
        if (status.endsAt > System.currentTimeMillis()) schedule(context, status.endsAt, alarmIntent(context, intent));
        else alarms.cancel(alarmIntent(context, intent));
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
