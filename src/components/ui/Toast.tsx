"use client";

import { cn } from "@/lib/utils";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type ToastVariant = "info" | "success" | "warning" | "danger";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  info: "border-info/60 bg-info/10 text-parchment",
  success: "border-success/60 bg-success/10 text-parchment",
  warning: "border-warning/60 bg-warning/10 text-parchment",
  danger: "border-danger/60 bg-danger/10 text-parchment",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto px-4 py-3 rounded-lg border backdrop-blur-md",
              "shadow-lg animate-[fadeIn_0.2s_var(--ease-fluid)]",
              variantStyles[t.variant],
            )}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
