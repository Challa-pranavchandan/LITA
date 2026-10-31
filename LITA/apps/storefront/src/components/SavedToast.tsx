"use client";

import { useEffect, useState } from "react";

export type ToastMessage = {
  id: string;
  message: string;
  type: "error" | "info" | "success";
};

type ToastListener = (toast: ToastMessage) => void;
const listeners = new Set<ToastListener>();

export function showSavedToast(
  message: string,
  type: "error" | "info" | "success" = "error"
) {
  const toast: ToastMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    type,
  };
  listeners.forEach((fn) => fn(toast));
}

export function SavedToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast: ToastListener = (toast) => {
      setToasts((prev) => [...prev, toast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-[13.5px] shadow-lg transition-all duration-300 transform translate-y-0 ${
            toast.type === "error"
              ? "bg-[#1E1E1E] text-white border border-[#333333]"
              : toast.type === "success"
              ? "bg-[#1B2B1B] text-white border border-[#2B4B2B]"
              : "bg-[#222222] text-white"
          }`}
        >
          <span className="leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-gray-400 hover:text-white text-base leading-none p-1 -mr-1"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
