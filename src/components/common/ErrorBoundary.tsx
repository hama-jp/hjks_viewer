"use client";

import { Component, type ReactNode } from "react";

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

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="rounded-xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 mb-4">表示中にエラーが発生しました</p>
          <p className="text-sm text-slate-400 mb-6">
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
