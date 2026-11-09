"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { DURATION } from "@/lib/motion";

const DWELL = DURATION.dwell * 1000;

type Toast = { id: string; text: string };

type ToastContextValue = {
  /** Never used for anything the reader must read. */
  post: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const post = useCallback(
    (text: string) => {
      const id = `toast-${Date.now()}-${text.length}`;
      setToasts((current) => [...current, { id, text }]);
      window.setTimeout(() => dismiss(id), DWELL);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ post }), [post]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast anim-disclose">
            <span>{toast.text}</span>
            <button
              type="button"
              className="hash-copy"
              onClick={() => dismiss(toast.id)}
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
}
