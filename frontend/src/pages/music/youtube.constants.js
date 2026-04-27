export const MIN_TRACK_DURATION_SECONDS = 90;
export const MAX_TRACK_DURATION_SECONDS = 360;

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

export const HARD_EXCLUDE_KEYWORDS = [
  "teaser",
  "trailer",
  "reaction",
  "podcast",
  "interview",
  "ringtone",
  "bgm",
];

export const SOFT_QUALITY_PENALTY_KEYWORDS = [
  "cover",
  "karaoke",
  "slowed",
  "reverb",
  "8d",
  "sped up",
  "bass boosted",
  "mashup",
  "fanmade",
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

export const PREFERRED_CHANNEL_HINTS = [
  // existing
  "topic",
  "vevo",
  "official",
  "music",
  "records",

  // major labels (global)
  "t-series",
  "universal music",
  "warner music",
  "atlantic records",
  "columbia records",

  // indian labels
  "zee music",
  "sony music",
  "saregama",
  "tips",
  "yrf",
  "aditya music",
  "lahari music",

  // artist authenticity signals
  "official artist channel",
  "artist channel",
  "official channel",

  // quality signals
  "hq",
  "hd",
];

export const MUSIC_INTENT_KEYWORDS = [
  // existing
  "song",
  "songs",
  "music",
  "video",
  "lyrics",
  "lyrical",
  "audio",
  "official",
  "ost",
  "soundtrack",
  "mv",
  "jukebox",
  "album",

  // stronger music intent
  "official video",
  "official audio",
  "full song",
  "full video",
  "audio song",
  "video song",

  // indian-specific
  "bollywood",
  "punjabi",
  "hindi song",
  "tamil song",
  "telugu song",
  "remix",
  "lofi",
  "sad song",
  "love song",

  // global patterns
  "feat",
  "ft.",
  "remastered",
  "live",
  "acoustic",
  "cover",

  // filtering junk
  "explicit",
];

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
];
