export const MIN_TRACK_DURATION_SECONDS = 90; // 1.5 minutes
export const MAX_TRACK_DURATION_SECONDS = 600; // 10 minutes

// Titles containing these instantly discard the video (no score redemption).
export const HARD_EXCLUDE_KEYWORDS = [
  // original
  "teaser",
  "trailer",
  "reaction",
  "podcast",
  "interview",
  "ringtone",
  "bgm",
  // moved from SOFT — karaoke is never an official single
  "karaoke",
  // compilation / non-single content (Req 4 & 5)
  "compilation",
  "full album",
  "concert",
  "live concert",
  "live session",
  "live performance",
  "non stop",
  "nonstop",
  "mega mix",
  "dj mix",
  "jukebox",
  // promotional / meta noise (Req 5)
  "promo",
  "related",
];

// Title keywords that match Shorts / very short video signals.
export const SHORT_FORM_KEYWORDS = [
  "#shorts",
  "shorts",
  "reels",
  "status",
  "whatsapp status",
  "insta reel",
  "yt shorts",
  "tiktok",
];

// Each match deducts 3 from the relevance score.
// Videos can still pass if they score above the minimum gate.
export const SOFT_QUALITY_PENALTY_KEYWORDS = [
  "cover",
  "slowed",
  "reverb",
  "8d",
  "sped up",
  "bass boosted",
  "mashup",
  "fanmade",
  // demoted from MUSIC_INTENT — lyric videos are deprioritised vs official MVs (Req 8)
  "lyrics",
  "lyrical",
  // live recordings deprioritised vs studio releases
  "live",
  // generic "mix" penalised; "remix" is unaffected thanks to word-boundary matching
  "mix",
  // album-track listings deprioritised
  "album",
];

export const QUERY_NOISE_KEYWORDS = [
  "slowed",
  "reverb",
  "8d",
  "sped up",
  "speed up",
  "bass boosted",
  "slowed + reverb",
  "slowed reverb",
];

export const TRENDING_QUERY_KEYWORDS = [
  "trending",
  "latest",
  "new",
  "recent",
  "popular",
  "top",
];

// Channel name fragments that earn +3 to the relevance score (Req 1 & 6).
export const PREFERRED_CHANNEL_HINTS = [
  "topic",
  "vevo",
  "official",
  "music",
  "records",

  // major global labels
  "t-series",
  "universal music",
  "warner music",
  "atlantic records",
  "columbia records",

  // Indian labels
  "zee music",
  "sony music",
  "saregama",
  "tips",
  "yrf",
  "aditya music",
  "lahari music",

  // authenticity signals
  "official artist channel",
  "artist channel",
  "official channel",

  // quality signals
  "hq",
  "hd",
];

// Title / channel keywords that add +2 to the relevance score.
// Note: "lyrics", "lyrical", "album", "jukebox", "live" removed — they now carry penalties.
export const MUSIC_INTENT_KEYWORDS = [
  "song",
  "songs",
  "music",
  "video",
  "audio",
  "official",
  "ost",
  "soundtrack",
  "mv",

  "official video",
  "official audio",
  "full song",
  "full video",
  "audio song",
  "video song",

  "bollywood",
  "punjabi",
  "hindi song",
  "tamil song",
  "telugu song",
  "remix",
  "lofi",
  "sad song",
  "love song",

  "feat",
  "ft.",
  "remastered",
  "acoustic",
  "explicit",
];

// Each match deducts 5 from the relevance score (Req 5 & 8).
export const BAD_KEYWORDS = [
  "reaction",
  "review",
  "trailer",
  "teaser",
  "status",
  "whatsapp status",
  "shorts",
  "clip",
  "edit",
  "meme",
  "dance cover",
  "fan made",
  // new (Req 5)
  "playlist",
  "album songs",
  "promo video",
  "related songs",
];

// Minimum combined relevance score a video must reach to appear in results (Req 6).
// Prevents clearly irrelevant videos from passing even when not hard-excluded.
export const MIN_VIDEO_SCORE = -2;
