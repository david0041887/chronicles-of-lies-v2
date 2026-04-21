"use client";

import { cn } from "@/lib/utils";
import { ReactNode, useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-veil/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative max-w-md w-full rounded-2xl",
          "bg-gradient-to-b from-veil to-[#120820] border border-gold/30",
          "p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)]",
          "animate-[fadeIn_0.2s_var(--ease-fluid)]",
          className,
        )}
      >
        {title && (
          <h2 className="display-serif text-2xl text-sacred mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
