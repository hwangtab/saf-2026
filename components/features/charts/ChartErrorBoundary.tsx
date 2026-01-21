'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

const DefaultFallback = () => (
  <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
    <div className="text-center text-charcoal-muted">
      <p className="text-lg mb-2">차트를 불러올 수 없습니다</p>
      <p className="text-sm">페이지를 새로고침 해주세요</p>
    </div>
  </div>
);

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Chart rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback />;
    }

    return this.props.children;
  }
}
