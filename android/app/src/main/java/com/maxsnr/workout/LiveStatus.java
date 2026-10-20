package com.maxsnr.workout;

import android.content.Intent;
import org.json.JSONArray;
import org.json.JSONObject;

/** The running workout as the app last described it (see NativeStatus in native-app.ts). */
final class LiveStatus {

    private static final String EXTRA = "status";

    /** When the countdown ends, or 0 while nothing counts (lifting). */
    final long endsAt;
    final long total;
    final String title;
    final String text;
    final String progress;
    final String chip;
    final String[] actions;
    final String doneTitle;
    final String doneText;
    /** Shown once the countdown ends (the next set), or null. */
    final LiveStatus after;
    private final String json;

    LiveStatus(JSONObject data, long now) {
        json = data.toString();
        endsAt = data.isNull("endsAt") ? 0 : data.optLong("endsAt", 0);
        // JS sends small numbers as ints; optLong reads both. Without a length, measure from now.
        long length = data.optLong("total", 0);
        total = length > 0 ? length : Math.max(1000, endsAt - now);
        title = data.optString("title", "Workout");
        text = data.optString("text", "");
        progress = data.optString("progress", "");
        chip = data.optString("chip", "");
        doneTitle = data.optString("doneTitle", "Time's up");
        doneText = data.optString("doneText", "");
        JSONArray list = data.optJSONArray("actions");
        actions = new String[list == null ? 0 : list.length()];
        for (int i = 0; i < actions.length; i++) actions[i] = list.optString(i);
        JSONObject next = data.optJSONObject("after");
        after = next == null ? null : new LiveStatus(next, now);
    }

    /** What to show at the given time: the next step once the countdown is over. */
    LiveStatus at(long now) {
        return after != null && endsAt > 0 && endsAt <= now ? after : this;
    }

    Intent into(Intent intent) {
        return intent.putExtra(EXTRA, json);
    }

    static LiveStatus from(Intent intent) {
        String json = intent.getStringExtra(EXTRA);
        if (json == null) return null;
        try {
            return new LiveStatus(new JSONObject(json), System.currentTimeMillis());
        } catch (org.json.JSONException broken) {
            return null;
        }
    }
}
