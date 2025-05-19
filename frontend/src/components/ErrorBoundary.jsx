import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="min-h-screen bg-primary-light flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-lg w-full">
            <h2 className="text-2xl font-medium text-error mb-4">Something went wrong</h2>
            
            <div className="mb-4">
              <p className="text-gray-800 mb-2">An error occurred in the application:</p>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono overflow-auto max-h-40">
                {this.state.error && this.state.error.toString()}
              </div>
            </div>
            
            {this.state.errorInfo && (
              <div className="mb-4">
                <p className="text-gray-800 mb-2">Component stack:</p>
                <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-between mt-4">
              <button 
                onClick={() => window.location.href = '/login'}
                className="btn-secondary"
              >
                Go to Login
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;