"use strict";

/**
 * Request ID Middleware
 * Assigns a unique UUID to every request for tracing and observability
 */

const { v4: uuidv4 } = require("uuid");

/**
 * Request ID Middleware
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @param {Function} next - Next middleware
 */
const requestId = (req, res, next) => {
  // Use existing ID if provided (e.g., from upstream proxy), or generate new one
  const id = req.header("X-Request-Id") || uuidv4();

  // Attach to request and response
  req.id = id;
  res.setHeader("X-Request-Id", id);

  next();
};

module.exports = requestId;
