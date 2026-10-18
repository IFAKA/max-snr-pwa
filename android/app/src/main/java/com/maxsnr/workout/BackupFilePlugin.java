package com.maxsnr.workout;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * History → Export in the Android app. A WebView ignores download links, so the backup is written
 * where the user chooses with the system's own "save as" screen; no storage permission is needed.
 */
@CapacitorPlugin(name = "BackupFile")
public class BackupFilePlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        if (call.getString("contents") == null) {
            call.reject("contents is required");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType("application/json")
            .putExtra(Intent.EXTRA_TITLE, call.getString("fileName", "maxsnr-backup.json"));
        startActivityForResult(call, intent, "saved");
    }

    @ActivityCallback
    private void saved(PluginCall call, ActivityResult result) {
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.reject("cancelled");
            return;
        }
        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            out.write(call.getString("contents").getBytes(StandardCharsets.UTF_8));
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not save the backup.", error);
        }
    }
}
