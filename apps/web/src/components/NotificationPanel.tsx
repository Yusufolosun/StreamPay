"use client";

import React, { useEffect } from "react";
import { X, Check, Trash2, Coins, CheckCircle, AlertTriangle, Clock, XCircle, ExternalLink } from "lucide-react";
import { useNotifications, NotificationEvent } from "../hooks/useNotifications";
import Link from "next/link";

function getRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const getIcon = (type: NotificationEvent["type"]) => {
  switch (type) {
    case "stream_claimable":
      return <Coins className="w-4.5 h-4.5 text-orange" />;
    case "milestone_released":
      return <CheckCircle className="w-4.5 h-4.5 text-green-500" />;
    case "dispute_raised":
      return <AlertTriangle className="w-4.5 h-4.5 text-red" />;
    case "stream_expiring":
      return <Clock className="w-4.5 h-4.5 text-yellow-500" />;
    case "stream_expired":
      return <XCircle className="w-4.5 h-4.5 text-gray" />;
    default:
      return <Coins className="w-4.5 h-4.5 text-orange" />;
  }
};

export const NotificationPanel: React.FC = () => {
  const {
    notifications,
    panelOpen,
    setPanelOpen,
    markRead,
    markAllRead,
    clearAll,
  } = useNotifications();

  useEffect(() => {
    if (panelOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [panelOpen]);

  if (!panelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={() => setPanelOpen(false)}
      />

      {/* Panel Container (Slide in from Right on Desktop, Bottom Sheet on Mobile) */}
      <div
        className={`relative w-full sm:w-96 bg-card-bg border-t sm:border-t-0 sm:border-l border-border h-[80vh] sm:h-full mt-auto sm:mt-0 flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 rounded-t-2xl sm:rounded-t-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-white text-lg">Notifications</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Keep track of stream events and milestones
            </p>
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-colors active:scale-95"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-6 py-2.5 border-b border-border bg-white/2">
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[11px] font-bold text-orange uppercase tracking-wider hover:opacity-85 active:scale-95 transition-all"
              style={{ minHeight: 32 }}
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Read
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-[11px] font-bold text-red uppercase tracking-wider hover:opacity-85 active:scale-95 transition-all"
              style={{ minHeight: 32 }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-text-secondary">
                <Coins className="w-6 h-6" />
              </div>
              <h4 className="text-white font-semibold mb-1 text-sm">All caught up!</h4>
              <p className="text-xs text-text-secondary max-w-[200px]">
                No new notifications. We'll update you when streams change.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`p-5 transition-all flex gap-3.5 cursor-pointer border-l-2 ${
                  !notif.isRead
                    ? "bg-orange/5 border-l-orange border-b border-border/40"
                    : "border-l-transparent border-b border-border/40"
                }`}
              >
                {/* Icon wrapper */}
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                {/* Message block */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm text-white font-bold leading-tight truncate`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-text-secondary font-medium shrink-0">
                      {getRelativeTime(notif.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="pt-2 flex items-center justify-between">
                    <Link
                      href={`/explorer/streams/${notif.streamId}`}
                      onClick={() => setPanelOpen(false)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-orange uppercase tracking-wider hover:underline"
                    >
                      View Stream
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    {!notif.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-orange" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
