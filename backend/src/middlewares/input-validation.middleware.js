"use strict";

/**
 * AI Input Validation Middleware
 * Protects AI endpoints from XSS, SQL injection, Prompt injection, and Cost explosion
 */

const ErrorResponse = require('../utils/ErrorResponse');

const SUSPICIOUS_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s+prompt/i,
  /act\s+as\s+/i,
  /dan\s+mode/i,
  /jailbreak/i,
  /<script/i,
  /javascript:/i
];

/**
 * Validates prompt input for risk and size
 */
const validateInputRisk = (input, label = "Input") => {
  if (!input || typeof input !== "string") return null;

  if (input.length > 500) {
    return `${label} exceeds safe character limit of 500`;
  }

  let riskScore = 0;
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(input)) riskScore++;
  }

  if (riskScore >= 2) {
    return `Security violation: ${label} contains high-risk patterns`;
  }

  return null;
};



exports.validateChatInput = (req, res, next) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return next(new ErrorResponse("Please send a message to continue", 400, "VALIDATION_ERROR"));
  }

  const lastMsg = messages[messages.length - 1];
  const riskErr = validateInputRisk(lastMsg.content, "Message");
  if (riskErr) {
    return next(new ErrorResponse(riskErr, 400, "SECURITY_ERROR"));
  }

  next();
};
