"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children }) => {
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
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`absolute top-0 left-0 bottom-0 w-80 max-w-[80vw] bg-card-bg border-r border-border p-6 shadow-2xl transition-transform duration-300 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        <div className="flex items-center justify-between mb-8">
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-orange to-violet bg-clip-text text-transparent">
            Menu
          </span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-colors active:scale-95 duration-150"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;
