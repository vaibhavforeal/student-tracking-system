import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Quick-use helper
export const toast = {
  success: (msg, dur) => useToastStore.getState().addToast(msg, 'success', dur),
  error: (msg, dur) => useToastStore.getState().addToast(msg, 'error', dur),
  warning: (msg, dur) => useToastStore.getState().addToast(msg, 'warning', dur),
  info: (msg, dur) => useToastStore.getState().addToast(msg, 'info', dur),
};
