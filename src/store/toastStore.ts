import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3200);
    const newItem: ToastItem = {
      ...toast,
      id,
      duration,
      createdAt: Date.now(),
    };
    set((state) => ({
      toasts: [...state.toasts.slice(-4), newItem],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }

    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

/**
 * Convenience helper for firing an in-app popup notification from anywhere.
 */
export function notify(
  toast: Omit<ToastItem, 'id' | 'createdAt'>
): string {
  return useToastStore.getState().addToast(toast);
}
