package com.musicdiscover.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Build;
import android.os.IBinder;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin that bridges the JavaScript music player with the native
 * Android foreground service.  Exposes methods to start/stop the service and
 * update the notification metadata, and forwards notification button actions
 * back to the WebView.
 */
@CapacitorPlugin(name = "MusicServicePlugin")
public class MusicServicePlugin extends Plugin {

    private static MusicServicePlugin instance;

    public static MusicServicePlugin getInstance() {
        return instance;
    }

    @Override
    public void load() {
        instance = this;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // JS → Native methods
    // ────────────────────────────────────────────────────────────────────────────

    /**
     * Starts the foreground service with initial track metadata.
     * Called from JS when playback begins.
     *
     * options: { title, artist, thumbnail, isPlaying }
     */
    @PluginMethod()
    public void startService(PluginCall call) {
        Context ctx = getContext();

        Intent serviceIntent = new Intent(ctx, MusicPlaybackService.class);
        serviceIntent.putExtra(MusicPlaybackService.EXTRA_TITLE,
                call.getString("title", "Music Discover"));
        serviceIntent.putExtra(MusicPlaybackService.EXTRA_ARTIST,
                call.getString("artist", ""));
        serviceIntent.putExtra(MusicPlaybackService.EXTRA_THUMBNAIL,
                call.getString("thumbnail", ""));
        serviceIntent.putExtra(MusicPlaybackService.EXTRA_IS_PLAYING,
                call.getBoolean("isPlaying", true));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(serviceIntent);
        } else {
            ctx.startService(serviceIntent);
        }

        call.resolve();
    }

    /**
     * Updates the notification metadata (title, artist, thumbnail).
     * Called from JS when the track changes.
     *
     * options: { title, artist, thumbnail }
     */
    @PluginMethod()
    public void updateMetadata(PluginCall call) {
        Context ctx = getContext();

        Intent serviceIntent = new Intent(ctx, MusicPlaybackService.class);
        serviceIntent.putExtra(MusicPlaybackService.EXTRA_TITLE,
                call.getString("title", "Music Discover"));
        serviceIntent.putExtra(MusicPlaybackService.EXTRA_ARTIST,
                call.getString("artist", ""));
        serviceIntent.putExtra(MusicPlaybackService.EXTRA_THUMBNAIL,
                call.getString("thumbnail", ""));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(serviceIntent);
        } else {
            ctx.startService(serviceIntent);
        }

        call.resolve();
    }

    /**
     * Updates the play/pause state on the notification.
     * Called from JS on togglePlay / pause / resume.
     *
     * options: { isPlaying: boolean }
     */
    @PluginMethod()
    public void updatePlaybackState(PluginCall call) {
        Context ctx = getContext();

        Intent serviceIntent = new Intent(ctx, MusicPlaybackService.class);
        serviceIntent.putExtra(MusicPlaybackService.EXTRA_IS_PLAYING,
                call.getBoolean("isPlaying", true));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(serviceIntent);
        } else {
            ctx.startService(serviceIntent);
        }

        call.resolve();
    }

    /**
     * Stops the foreground service and dismisses the notification.
     * Called from JS when the user explicitly stops playback or clears
     * the queue.
     */
    @PluginMethod()
    public void stopService(PluginCall call) {
        Context ctx = getContext();
        Intent serviceIntent = new Intent(ctx, MusicPlaybackService.class);
        ctx.stopService(serviceIntent);
        call.resolve();
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Native → JS (notification button actions)
    // ────────────────────────────────────────────────────────────────────────────

    /**
     * Called by {@link MusicNotificationReceiver} when a notification button
     * is tapped.  Fires an event that the JS side can listen for.
     *
     * @param action one of "play", "pause", "next", "previous", "stop"
     */
    public void forwardActionToWebView(String action) {
        JSObject data = new JSObject();
        data.put("action", action);
        notifyListeners("musicServiceAction", data);
    }
}
