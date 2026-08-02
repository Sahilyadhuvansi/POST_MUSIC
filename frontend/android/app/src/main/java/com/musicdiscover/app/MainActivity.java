package com.musicdiscover.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

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
