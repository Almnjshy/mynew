import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="screen-container title-bg flex flex-col items-center justify-center gap-6 p-8">
          <AlertTriangle size={64} className="text-red-400" />
          <h2 className="text-3xl font-bold text-white">عذراً!</h2>
          <p className="text-white/70 text-center">
            حدث خطأ غير متوقع.<br/>
            يمكنك المحاولة مرة أخرى.
          </p>
          <button 
            onClick={this.handleReset}
            className="game-btn game-btn-primary gap-3"
          >
            <RefreshCw size={20} /> إعادة المحاولة
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
