import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d131f",
          color: "#e2e8f0",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "20px",
          textAlign: "center"
        }}>
          <div style={{
            background: "#161f30",
            border: "1px solid #2d3b55",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "480px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
          }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px", color: "#f87171" }}>
              Application Notice
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "20px", lineHeight: "1.5" }}>
              The application encountered an unexpected issue while rendering.
            </p>
            {this.state.error?.message && (
              <pre style={{
                background: "#090d16",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#cbd5e1",
                textAlign: "left",
                overflowX: "auto",
                marginBottom: "20px"
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer"
              }}
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
