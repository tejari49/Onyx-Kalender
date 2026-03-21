import React from 'react';

export default class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      componentDidCatch(error, info) {
        console.error('[Onyx] UI ErrorBoundary:', error, info);
      }
      render() {
        if (this.state.hasError) {
          return (
            <div className="absolute inset-0 bg-black text-white flex items-center justify-center p-6">
              <div className="max-w-md w-full border border-neutral-800 rounded-2xl p-6 bg-neutral-950/60">
                <h3 className="text-lg font-semibold mb-2">Ups – ein Fehler ist passiert</h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Die Ansicht konnte nicht gerendert werden. Du kannst zurückgehen oder neu laden.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-white text-black font-semibold py-2 rounded-xl hover:bg-gray-200 transition-colors"
                    onClick={() => {
                      this.setState({ hasError: false, error: null });
                      try { this.props.onReset && this.props.onReset(); } catch (e) {}
                    }}
                  >
                    Zurück
                  </button>
                  <button
                    className="flex-1 bg-neutral-800 text-white font-semibold py-2 rounded-xl hover:bg-neutral-700 transition-colors"
                    onClick={() => window.location.reload()}
                  >
                    Neu laden
                  </button>
                </div>
                <details className="mt-4">
                  <summary className="text-xs text-neutral-500 cursor-pointer">Details</summary>
                  <pre className="mt-2 text-[10px] text-neutral-400 whitespace-pre-wrap break-words">{String(this.state.error || '')}</pre>
                </details>
              </div>
            </div>
          );
        }
        return this.props.children;
      }
    }
