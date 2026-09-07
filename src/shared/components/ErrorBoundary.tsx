"use client"

/**
 * Keeps one broken part of a screen from taking the whole page with it.
 *
 * Without a boundary, React unmounts everything above the fault and the person
 * gets a blank page with no way forward. With one, the rest of the app keeps
 * working and the broken part offers to try again.
 *
 * It also reports. A boundary that swallows the error is worse than no boundary
 * at all: the page looks fine and the fault is invisible forever.
 */

import { Component, type ErrorInfo, type ReactNode } from "react"

import { reportError } from "../errorReportService"

interface Props {
  children: ReactNode
  /** What broke, in the user's words: "the timer", "your reports" */
  label?: string
}

interface State {
  failed: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack ?? undefined })
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children

    return (
      <div className="m-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">
          Something went wrong{this.props.label ? ` with ${this.props.label}` : ""}.
        </p>
        <p className="mt-1 text-muted-foreground">
          It has been reported. Nothing you have saved is affected.
        </p>
        <button
          type="button"
          onClick={() => this.setState({ failed: false })}
          className="mt-3 rounded-md border border-border px-3 py-1.5 hover:bg-secondary/60"
        >
          Try again
        </button>
      </div>
    )
  }
}
