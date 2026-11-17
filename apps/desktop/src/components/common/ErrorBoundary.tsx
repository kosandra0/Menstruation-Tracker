import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorFallback } from "./ErrorFallback";

interface State { failed: boolean }

/** Catches render errors. Deliberately logs only the component stack, never app state. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(_error: Error, info: ErrorInfo) {
    console.error("UI render error", info.componentStack);
  }
  render() {
    return this.state.failed ? <ErrorFallback onRetry={() => this.setState({ failed: false })} /> : this.props.children;
  }
}
