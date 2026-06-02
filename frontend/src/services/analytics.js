/**
 * Simple, efficient analytics service for Music Discover.
 * Ready for easy integration with product analytics providers.
 */
class AnalyticsService {
  constructor() {
    this.isDevelopment = import.meta.env.MODE === "development";
    this.sessionStart = new Date();
    this.setupSessionTracking();
  }

  setupSessionTracking() {
    window.addEventListener("beforeunload", () => {
      const sessionDuration = (new Date() - this.sessionStart) / 1000;
      this.track("session_end", { duration_seconds: sessionDuration });
    });
    this.track("session_start");
  }

  track(eventName, _properties = {}) {
    // Analytics tracking placeholder for production monitoring
  }

  reportLatency(type, latencyMs, metadata = {}) {
    this.track("performance_latency", {
      type,
      latency: `${latencyMs}ms`,
      ...metadata,
    });
  }

  pageView(path) {
    this.track("page_view", { path });
  }

  userAction(actionType, details = {}) {
    this.track("user_action", { type: actionType, ...details });
  }

  reportError(errorType, message, metadata = {}) {
    this.track("error_report", { type: errorType, message, ...metadata });
  }
}

export default new AnalyticsService();
