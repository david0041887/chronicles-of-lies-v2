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
      {/* Container is just a layout box — each toast carries its own
          role="status" which implies aria-live="polite", so no aria
          attrs here (otherwise screen readers double-announce). Top
          offset uses --topbar-height + safe-area so the stack clears
          a notched iPhone instead of getting clipped under the bar. */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none w-[min(92vw,24rem)] items-center"
        style={{
          top: "calc(3rem + env(safe-area-inset-top, 0px) + 1rem)",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto px-4 py-3 rounded-lg border backdrop-blur-md",
              "shadow-lg animate-[fadeIn_0.2s_var(--ease-fluid)] text-sm max-w-full text-center",
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
