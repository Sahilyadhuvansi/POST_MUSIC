"use strict";

// CommonJS validator using envalid
const { cleanEnv, str, url, num } = require("envalid");

const env = cleanEnv(process.env, {
  // PORT handled as number to match server expectations
  PORT: num({ default: 3001 }),

  // Optional values with sensible defaults
  frontend_URL: str({ default: "http://localhost:5173" }),
  CORS_ORIGINS: str({ default: "http://localhost:5173" }),
  MONGO_URI: str({ default: "" }), // Handle missing vars in db service
  JWT_SECRET: str({ default: "dev_fallback_not_secure_change_me" }),
  DEFAULT_AVATAR: url({
    default: "https://www.gravatar.com/avatar/?d=mp&f=y&s=200",
  }),

  // ImageKit keys are optional strings (empty allowed)
  IMAGEKIT_PRIVATE_KEY: str({ default: "" }),
  IMAGEKIT_PUBLIC_KEY: str({ default: "" }),

  // IMPORTANT: url() requires a valid URL. Use str() if empty string is an acceptable default.
  IMAGEKIT_URL_ENDPOINT: str({ default: "" }),

  // AI providers (optional — features degrade gracefully when unset)
  GROQ_API_KEY: str({ default: "" }),
  GEMINI_API_KEY: str({ default: "" }),

  // Redis (optional — falls back to in-memory stores when unset)
  REDIS_URL: str({ default: "" }),
});

module.exports = env;
