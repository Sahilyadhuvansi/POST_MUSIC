package com.musicdiscover.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register the custom Capacitor plugin for foreground-service control
        registerPlugin(MusicServicePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Keep WebView JS timers running while the app is backgrounded so
        // music playback (YouTube iframe) continues instead of freezing.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().resumeTimers();
        }
    }
}
