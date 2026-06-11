"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X, ExternalLink } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  txId?: string;
}

interface ToastContextType {
  toast: (options: { type: ToastType; title: string; message: string; txId?: string }) => void;
  success: (message: string, txId?: string) => void;
  error: (message: string) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, message, txId }: { type: ToastType; title: string; message: string; txId?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, txId }]);

      // Auto dismiss
      setTimeout(() => {
        remove(id);
      }, 6000);
    },
    [remove]
  );

  const success = useCallback(
    (message: string, txId?: string) => {
      toast({ type: "success", title: "Success", message, txId });
    },
    [toast]
  );

  const error = useCallback(
    (message: string) => {
      toast({ type: "error", title: "Error", message });
    },
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, remove }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex gap-3 p-4 border rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 ${
              t.type === "success"
                ? "bg-green-950/80 border-green-500/30 text-green-200"
                : t.type === "error"
                ? "bg-red-950/80 border-red-500/30 text-red-200"
                : "bg-card-bg/90 border-border text-white"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <h4 className="font-bold text-sm text-white">{t.title}</h4>
              <p className="text-xs mt-1 text-text-secondary">{t.message}</p>
              {t.txId && (
                <a
                  href={`https://explorer.hiro.so/txid/${t.txId}?chain=testnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange hover:underline mt-2 pointer-events-auto"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <button
              onClick={() => remove(t.id)}
              className="p-1 hover:bg-white/5 rounded text-text-secondary hover:text-white shrink-0 self-start transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
