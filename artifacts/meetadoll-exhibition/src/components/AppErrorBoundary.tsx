import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Meetadoll app crashed:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        role="alert"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#fffaf8",
          color: "#241a18",
          fontFamily: "Arial, Helvetica, sans-serif",
          textAlign: "center",
        }}
      >
        <section style={{ maxWidth: "440px" }}>
          <p
            style={{
              margin: "0 0 12px",
              color: "#8b0000",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Meetadoll Exhibition
          </p>
          <h1 style={{ margin: "0 0 12px", fontSize: "28px" }}>
            We couldn&apos;t load this page
          </h1>
          <p style={{ margin: "0 0 24px", color: "#6b5d59", lineHeight: 1.6 }}>
            Please refresh the page and try again. If the problem continues, our
            team is working to resolve it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: 0,
              borderRadius: "999px",
              padding: "12px 22px",
              background: "#8b0000",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Refresh page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                marginTop: "24px",
                overflow: "auto",
                padding: "12px",
                borderRadius: "8px",
                background: "#f3e9e5",
                color: "#6b1d1d",
                fontSize: "11px",
                textAlign: "left",
                whiteSpace: "pre-wrap",
              }}
            >
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          )}
        </section>
      </main>
    );
  }
}