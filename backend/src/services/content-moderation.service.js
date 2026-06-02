"use strict";

const vision = require("@google-cloud/vision");
const Filter = require("bad-words");
const Sentiment = require("sentiment");
const aiConfig = require("../config/ai.config");

/**
 * AI Content Moderation Service (Safety Intelligence)
 * Filters inappropriate content (images, text, spam) using multi-layer analysis.
 */
class ContentModerationService {
  constructor() {
    // Initialize Google Cloud Vision if configured
    if (aiConfig.googleVision.enabled) {
      this.visionClient = new vision.ImageAnnotatorClient({
        keyFilename: aiConfig.googleVision.keyFilename,
      });
    }

    this.filter = new Filter();
    this.sentiment = new Sentiment();
    this.spamPatterns = [
      /buy now/i,
      /click here/i,
      /free money/i,
      /earn \$\d+/i,
      /winner/i,
      /congratulations/i,
      /prize/i,
    ];
  }

  /**
   * Moderate image content using Computer Vision (CV)
   */
  async moderateImage(imageBuffer) {
    if (!this.visionClient)
      return { safe: true, warning: "Vision service inactive" };

    try {
      const [result] = await this.visionClient.safeSearchDetection(imageBuffer);
      const detections = result.safeSearchAnnotation;

      const isNSFW =
        detections.adult === "LIKELY" ||
        detections.adult === "VERY_LIKELY" ||
        detections.violence === "LIKELY" ||
        detections.violence === "VERY_LIKELY";

      const hasRacy =
        detections.racy === "LIKELY" || detections.racy === "VERY_LIKELY";

      return {
        safe: !isNSFW,
        detections,
        shouldFlag: isNSFW,
        shouldWarn: hasRacy,
        reason: isNSFW
          ? "Violation: Inappropriate content"
          : "Visual content analyzed",
      };
    } catch {
      // console log scrubbed
      return {
        safe: true,
        error: "Vision scan bypassed due to service error.",
      };
    }
  }

  /**
   * Moderate text content using Sentiment and NLP (Natural Language Processing)
   */
  moderateText(text) {
    if (!text || text.trim().length === 0) return { safe: true };

    const result = { safe: true, issues: [], severity: "none" };

    // ─── Profanity Check ───
    if (this.filter.isProfane(text)) {
      result.safe = false;
      result.issues.push("Profanity detected");
      result.severity = "medium";
      result.cleanedText = this.filter.clean(text);
    }

    // ─── Sentiment Toxicity Check ───
    const sentimentResult = this.sentiment.analyze(text);
    if (sentimentResult.score < -5) {
      result.issues.push("Toxic tone detected");
      if (result.severity === "none") result.severity = "low";
    }

    // ─── Spam Pattern Matching ───
    const isSpam = this.spamPatterns.some((pattern) => pattern.test(text));
    if (isSpam) {
      result.safe = false;
      result.issues.push("Spam/Scam pattern");
      result.severity = "high";
    }

    return result;
  }

  /**
   * Universal Content Moderation (Holistic Analysis)
   */
  async moderateContent(options = {}) {
    const { text = null, image = null } = options;

    const results = {
      safe: true,
      textModeration: null,
      imageModeration: null,
      overallSeverity: "none",
      shouldBlock: false,
    };

    if (text) {
      results.textModeration = this.moderateText(text);
      if (!results.textModeration.safe) {
        results.safe = false;
        results.overallSeverity = results.textModeration.severity;
      }
    }

    if (image) {
      results.imageModeration = await this.moderateImage(image);
      if (results.imageModeration && !results.imageModeration.safe) {
        results.safe = false;
        results.overallSeverity = "critical";
      }
    }

    if (results.overallSeverity === "critical") results.shouldBlock = true;

    return results;
  }

  getStats() {
    return {
      activeEngines: { vision: !!this.visionClient, nlp: true },
      safetyVersion: "2.1.0",
    };
  }
}

module.exports = new ContentModerationService();
