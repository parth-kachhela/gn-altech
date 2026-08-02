import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
          <div className="rounded-lg border p-8 shadow-sm">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {this.state.message || 'An unexpected error occurred in the application.'}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button onClick={() => window.location.reload()}>Reload</Button>
              <Button asChild variant="outline">
                <a href="/dashboard">Go to Dashboard</a>
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
