"use client";

import React from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";

export const NotificationBell: React.FC = () => {
  const { unreadCount, setPanelOpen } = useNotifications();

  return (
    <button
      onClick={() => setPanelOpen(true)}
      className="relative p-2.5 rounded-lg border border-border bg-card-bg text-text-secondary hover:text-white hover:border-orange/30 transition-all duration-150 active:scale-95 cursor-pointer"
      aria-label="Open notifications"
      style={{ minWidth: 44, minHeight: 44 }}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red text-[10px] font-bold text-white shadow-lg ring-2 ring-dark-bg animate-in zoom-in-50 duration-200">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
