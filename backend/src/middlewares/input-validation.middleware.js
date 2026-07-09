"use strict";

const ErrorResponse = require("../utils/ErrorResponse");

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s+prompt/i,
  /act\s+as\s+/i,
  /dan\s+mode/i,
  /jailbreak/i,
  /<script/i,
  /javascript:/i,
];

const checkRisk = (input, label = "Input") => {
  if (!input || typeof input !== "string") return null;
  if (input.length > 500) return `${label} exceeds 500 character limit`;
  const hits = INJECTION_PATTERNS.filter(p => p.test(input)).length;
  if (hits >= 2) return `Security violation: ${label} contains disallowed patterns`;
  return null;
};

exports.validateChatInput = (req, res, next) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || !messages.length) {
    return next(new ErrorResponse("Please send a message to continue", 400, "VALIDATION_ERROR"));
  }

  const last = messages[messages.length - 1];
  const err = checkRisk(last?.content, "Message");
  if (err) return next(new ErrorResponse(err, 400, "SECURITY_ERROR"));

  next();
};
