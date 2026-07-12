import React, { Component, ErrorInfo, ReactNode } from "react";

interface WindowWithMonitoring extends Window {
  Sentry?: {
    captureException: (
      error: Error,
      options?: { contexts?: { react?: { componentStack?: string } } },
    ) => void;
  };
  posthog?: {
    capture: (event: string, properties?: Record<string, unknown>) => void;
  };
}
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { CorrelationIdContext, logError } from "@/lib/observability";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Structured logging for observability
    const correlationId = CorrelationIdContext.getRequestId();
    logError("React Error Boundary caught error", error, {
      correlationId,
      componentStack: errorInfo.componentStack,
      errorBoundary: "ErrorBoundary",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });

    // Legacy console logging for backward compatibility
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // In production, send to Sentry/PostHog
    if (typeof window !== "undefined") {
      const w = window as WindowWithMonitoring;
      // Send to error monitoring
      if (w.Sentry) {
        w.Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack ?? undefined,
            },
          },
        });
      }

      // Send to product analytics
      if (w.posthog) {
        w.posthog.capture("error_boundary_triggered", {
          error: error.message,
          componentStack: errorInfo.componentStack,
        });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-sm border border-border bg-card p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-accent/50">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-lg font-semibold">Something went wrong</h3>
            <p className="max-w-sm text-[13px] text-muted-foreground">
              We encountered an unexpected error. Please try refreshing the page or contact support
              if the problem persists.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-[12px] font-medium text-muted-foreground">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-[11px] text-red-600">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="h-8 rounded-sm text-[12px] uppercase tracking-[0.12em]"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh Page
            </Button>
            <Button
              size="sm"
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="h-8 rounded-sm bg-foreground text-[12px] uppercase tracking-[0.12em] text-background hover:bg-foreground/90"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
