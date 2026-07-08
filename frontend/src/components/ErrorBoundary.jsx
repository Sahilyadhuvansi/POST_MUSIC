import React, { Component } from "react";
import { AlertTriangle } from "lucide-react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-[10%] -right-[10%] w-[40rem] h-[40rem] bg-red-600/8 rounded-full blur-[160px]" />
            <div className="absolute -bottom-[10%] -left-[10%] w-[40rem] h-[40rem] bg-indigo-600/8 rounded-full blur-[160px]" />
          </div>

          <div className="relative text-center space-y-8 max-w-md w-full">
            <div className="flex justify-center">
              <div className="p-5 rounded-3xl glass border border-red-500/20 shadow-2xl">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black text-white italic tracking-tight">
                Something broke
              </h1>
              <p className="text-sm text-neutral-500 font-medium uppercase tracking-[0.2em]">
                An unexpected error occurred
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white text-sm font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_12px_40px_rgba(99,102,241,0.3)]"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
