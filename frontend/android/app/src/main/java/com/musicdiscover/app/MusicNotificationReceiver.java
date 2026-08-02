package com.musicdiscover.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Handles notification button taps (Play, Pause, Next, Previous, Stop).
 *
 * For Play/Pause/Next/Previous the action is forwarded to the WebView via
 * {@link MusicServicePlugin}.  For Stop, the service is stopped directly.
 */
public class MusicNotificationReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();

        switch (action) {
            case MusicPlaybackService.ACTION_STOP:
                // Stop the foreground service entirely
                Intent stopIntent = new Intent(context, MusicPlaybackService.class);
                context.stopService(stopIntent);

                // Also notify the WebView so the JS player state stays in sync
                MusicServicePlugin plugin = MusicServicePlugin.getInstance();
                if (plugin != null) {
                    plugin.forwardActionToWebView("stop");
                }
                break;

            case MusicPlaybackService.ACTION_PLAY:
                notifyWebView("play");
                break;

            case MusicPlaybackService.ACTION_PAUSE:
                notifyWebView("pause");
                break;

            case MusicPlaybackService.ACTION_NEXT:
                notifyWebView("next");
                break;

            case MusicPlaybackService.ACTION_PREV:
                notifyWebView("previous");
                break;
        }
    }

    private void notifyWebView(String action) {
        MusicServicePlugin plugin = MusicServicePlugin.getInstance();
        if (plugin != null) {
            plugin.forwardActionToWebView(action);
        }
    }
}
