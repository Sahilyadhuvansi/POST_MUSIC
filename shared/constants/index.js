"use strict";

/**
 * Shared Constants
 * Shared across backend and frontend to ensure business logic consistency
 */

module.exports = {
  MUSIC_PER_PAGE: 15,

  // Feature Flags
  IS_AI_ENABLED: true,
  IS_REGISTRATION_OPEN: true,

  // Common Constraints
  USER_ROLES: {
    USER: "USER",
    ADMIN: "ADMIN",
    ARTIST: "ARTIST",
  },

  // HTTP Status Codes (Subset)
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
};
