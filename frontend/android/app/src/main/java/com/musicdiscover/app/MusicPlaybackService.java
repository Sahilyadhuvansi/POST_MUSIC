package com.musicdiscover.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Foreground service that keeps music playback alive when the app is
 * backgrounded or the screen is off.  Displays a persistent media
 * notification with Play/Pause, Next, Previous and Stop controls.
 */
public class MusicPlaybackService extends Service {

    public static final String CHANNEL_ID = "music_playback_channel";
    public static final int NOTIFICATION_ID = 1001;

    // Intent actions sent from MusicNotificationReceiver
    public static final String ACTION_PLAY    = "com.musicdiscover.app.ACTION_PLAY";
    public static final String ACTION_PAUSE   = "com.musicdiscover.app.ACTION_PAUSE";
    public static final String ACTION_NEXT    = "com.musicdiscover.app.ACTION_NEXT";
    public static final String ACTION_PREV    = "com.musicdiscover.app.ACTION_PREV";
    public static final String ACTION_STOP    = "com.musicdiscover.app.ACTION_STOP";

    // Extras sent when starting / updating the service
    public static final String EXTRA_TITLE     = "title";
    public static final String EXTRA_ARTIST    = "artist";
    public static final String EXTRA_THUMBNAIL = "thumbnail";
    public static final String EXTRA_IS_PLAYING = "isPlaying";

    private PowerManager.WakeLock wakeLock;

    private String currentTitle  = "Music Discover";
    private String currentArtist = "";
    private String currentThumbnailUrl = null;
    private boolean currentIsPlaying = true;
    private Bitmap currentArtwork = null;

    // ────────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ────────────────────────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();

            // Handle notification button actions forwarded from the receiver
            if (action != null) {
                switch (action) {
                    case ACTION_PLAY:
                    case ACTION_PAUSE:
                    case ACTION_NEXT:
                    case ACTION_PREV:
                        // These are forwarded to the WebView by the plugin
                        break;
                    case ACTION_STOP:
                        stopSelf();
                        return START_NOT_STICKY;
                }
            }

            // Update metadata from extras
            if (intent.hasExtra(EXTRA_TITLE)) {
                currentTitle = intent.getStringExtra(EXTRA_TITLE);
            }
            if (intent.hasExtra(EXTRA_ARTIST)) {
                currentArtist = intent.getStringExtra(EXTRA_ARTIST);
            }
            if (intent.hasExtra(EXTRA_IS_PLAYING)) {
                currentIsPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, true);
            }
            if (intent.hasExtra(EXTRA_THUMBNAIL)) {
                String newUrl = intent.getStringExtra(EXTRA_THUMBNAIL);
                if (newUrl != null && !newUrl.equals(currentThumbnailUrl)) {
                    currentThumbnailUrl = newUrl;
                    loadArtworkAsync(newUrl);
                }
            }
        }

        // Build and show notification
        startForeground(NOTIFICATION_ID, buildNotification());
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Notification
    // ────────────────────────────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Music Playback",
                    NotificationManager.IMPORTANCE_LOW   // No sound for media notification
            );
            channel.setDescription("Controls for music playback");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager mgr = getSystemService(NotificationManager.class);
            if (mgr != null) mgr.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        // Tap notification → open the app
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
                this, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Notification action intents
        PendingIntent prevPending  = makePending(ACTION_PREV,  1);
        PendingIntent playPending  = makePending(ACTION_PLAY,  2);
        PendingIntent pausePending = makePending(ACTION_PAUSE, 3);
        PendingIntent nextPending  = makePending(ACTION_NEXT,  4);
        PendingIntent stopPending  = makePending(ACTION_STOP,  5);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(openPending)
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                        .setShowActionsInCompactView(0, 1, 2))  // prev, play/pause, next in compact
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevPending);

        // Play or Pause button depending on current state
        if (currentIsPlaying) {
            builder.addAction(android.R.drawable.ic_media_pause, "Pause", pausePending);
        } else {
            builder.addAction(android.R.drawable.ic_media_play, "Play", playPending);
        }

        builder.addAction(android.R.drawable.ic_media_next, "Next", nextPending)
               .addAction(android.R.drawable.ic_delete, "Stop", stopPending);

        if (currentArtwork != null) {
            builder.setLargeIcon(currentArtwork);
        }

        return builder.build();
    }

    private PendingIntent makePending(String action, int requestCode) {
        Intent intent = new Intent(this, MusicNotificationReceiver.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(
                this, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /**
     * Public helper so the plugin can refresh the notification after updating state.
     */
    public void refreshNotification() {
        NotificationManager mgr = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (mgr != null) {
            mgr.notify(NOTIFICATION_ID, buildNotification());
        }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Artwork loading (async)
    // ────────────────────────────────────────────────────────────────────────────

    private void loadArtworkAsync(final String imageUrl) {
        new Thread(() -> {
            try {
                URL url = new URL(imageUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.connect();
                InputStream input = connection.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(input);
                input.close();
                connection.disconnect();

                if (bitmap != null) {
                    // Scale down for notification
                    currentArtwork = Bitmap.createScaledBitmap(bitmap, 256, 256, true);
                    if (bitmap != currentArtwork) bitmap.recycle();
                    refreshNotification();
                }
            } catch (Exception e) {
                // Artwork loading failed — notification works without it
            }
        }).start();
    }

    // ────────────────────────────────────────────────────────────────────────────
    // WakeLock
    // ────────────────────────────────────────────────────────────────────────────

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "MusicDiscover::PlaybackWakeLock"
            );
            wakeLock.acquire(12 * 60 * 60 * 1000L); // 12 hours max
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception e) {
                // Already released
            }
            wakeLock = null;
        }
    }

    // ── Public setters (called by the plugin) ────────────────────────────────

    public void setTitle(String title)   { this.currentTitle = title; }
    public void setArtist(String artist) { this.currentArtist = artist; }
    public void setIsPlaying(boolean playing) { this.currentIsPlaying = playing; }
    public void setThumbnailUrl(String url) {
        if (url != null && !url.equals(currentThumbnailUrl)) {
            currentThumbnailUrl = url;
            loadArtworkAsync(url);
        }
    }
}
