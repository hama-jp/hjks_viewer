"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="rounded-xl bg-white dark:bg-slate-800 p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">表示中にエラーが発生しました</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {this.state.error?.message ?? "不明なエラー"}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
