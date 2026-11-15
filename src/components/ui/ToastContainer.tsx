import React from 'react';
import { useToastStore, type ToastItem } from '../../store/toastStore';
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  RotateCcw,
} from 'lucide-react';

const ToastCard: React.FC<{ item: ToastItem; onDismiss: (id: string) => void }> = ({
  item,
  onDismiss,
}) => {
  const stylesByType = {
    success: {
      bg: 'bg-white',
      stripe: 'bg-neo-teal',
      badgeBg: 'bg-neo-teal/25',
      icon: <CheckCircle2 className="w-4 h-4 text-neo-ink shrink-0" strokeWidth={2.5} />,
    },
    error: {
      bg: 'bg-white',
      stripe: 'bg-neo-vermilion',
      badgeBg: 'bg-neo-vermilion/20',
      icon: <AlertOctagon className="w-4 h-4 text-neo-vermilion shrink-0" strokeWidth={2.5} />,
    },
    warning: {
      bg: 'bg-white',
      stripe: 'bg-neo-yellow',
      badgeBg: 'bg-neo-yellow/35',
      icon: <AlertTriangle className="w-4 h-4 text-neo-ink shrink-0" strokeWidth={2.5} />,
    },
    info: {
      bg: 'bg-white',
      stripe: 'bg-neo-violet',
      badgeBg: 'bg-neo-violet/20',
      icon: <Info className="w-4 h-4 text-neo-violet shrink-0" strokeWidth={2.5} />,
    },
  }[item.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto w-full max-w-sm ${stylesByType.bg} border-2 border-neo-ink rounded-xl shadow-[4px_4px_0px_#141414] overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-2`}
    >
      <div className="flex items-stretch">
        <div className={`w-2 ${stylesByType.stripe} border-r-2 border-neo-ink shrink-0`} />
        <div className="p-3 flex-1 flex items-start gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg border border-neo-ink ${stylesByType.badgeBg}`}>
            {stylesByType.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading font-bold text-xs text-neo-ink leading-snug">
              {item.title}
            </div>
            {item.message && (
              <p className="font-mono text-[11px] text-gray-600 mt-0.5 leading-relaxed break-words">
                {item.message}
              </p>
            )}
          </div>
          <button
            onClick={() => onDismiss(item.id)}
            className="p-1 text-gray-500 hover:text-neo-ink hover:bg-neo-bg rounded transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 right-3 left-3 sm:left-auto z-[100] pointer-events-none flex flex-col items-center sm:items-end gap-2">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={removeToast} />
      ))}
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class WyzardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Wyzard ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-neo-bg flex items-center justify-center p-4 select-none">
          <div className="max-w-md w-full bg-white border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg p-6 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neo-vermilion/20 border-2 border-neo-ink flex items-center justify-center">
              <AlertOctagon className="w-6 h-6 text-neo-vermilion" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-neo-ink">
                Recoverable Workspace Error
              </h2>
              <p className="font-mono text-xs text-gray-600 mt-1">
                {this.state.errorMessage}
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="flex items-center gap-2 px-4 py-2 bg-neo-yellow text-neo-ink border-2 border-neo-ink rounded-lg font-mono text-xs font-bold shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resume Wyzard Studio</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
