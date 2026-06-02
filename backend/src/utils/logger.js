"use strict";

const winston = require("winston");

/**
 * Centralized Logger Service (Pino/Winston)
 * Senior Best Practice: Log to stdout for Docker/Vercel with structured JSON
 */

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === "production"
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
  ),
  defaultMeta: { service: "music-discover-api" },
  transports: [new winston.transports.Console()],
});

module.exports = logger;
