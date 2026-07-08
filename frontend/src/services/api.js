import axios from "axios";
import { API_URL } from "../config";
import analytics from "./analytics";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: false,
  timeout: 15000,
});

// Request Interceptor: Attach JWT Token & Tracking
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.metadata = { startTime: new Date() };
  return config;
});

// Response Interceptor: Performance Tracking & Global Errors
api.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime;
    analytics.track("api_latency", {
      url: response.config.url,
      method: response.config.method,
      duration: `${duration}ms`,
      status: response.status,
      requestId: response.headers["x-request-id"]
    });
    return response;
  },
  (error) => {
    const duration = error.config?.metadata?.startTime 
      ? new Date() - error.config.metadata.startTime 
      : null;
    
    analytics.track("api_error", {
      url: error.config?.url,
      status: error.response?.status || "network_error",
      duration: duration ? `${duration}ms` : "unknown",
      message: error.message
    });

    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
