"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300 sm:hidden ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet Panel */}
      <div
        className={`relative w-full max-h-[85vh] bg-card-bg border-t border-border rounded-t-2xl p-6 shadow-2xl transition-transform duration-300 transform ${
          isOpen ? "translate-y-0" : "translate-y-full"
        } flex flex-col`}
      >
        {/* Drag handle decoration */}
        <div className="w-12 h-1 bg-border rounded-full mx-auto mb-4 shrink-0" />

        <div className="flex items-center justify-between mb-4 shrink-0">
          {title ? (
            <h3 className="font-bold text-lg text-white">{title}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-colors active:scale-95 duration-150"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">{children}</div>
      </div>
    </div>
  );
};

export default BottomSheet;
