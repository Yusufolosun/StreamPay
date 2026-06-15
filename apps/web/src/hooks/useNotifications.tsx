"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useWallet } from "./useWallet";

export interface NotificationEvent {
  id: string;
  type: "stream_claimable" | "milestone_released" | "dispute_raised" | "stream_expiring" | "stream_expired";
  title: string;
  message: string;
  streamId: string;
  timestamp: number;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: NotificationEvent[];
  unreadCount: number;
  isWsConnected: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  addNotification: (notification: Omit<NotificationEvent, "id" | "timestamp" | "isRead">) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected, blockHeight } = useWallet();
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const prevBalancesRef = useRef<Record<string, string>>({});
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  // Compute unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Load notifications from localStorage on wallet connect
  useEffect(() => {
    if (isConnected && address) {
      const stored = localStorage.getItem(`notifications-${address}`);
      if (stored) {
        try {
          setNotifications(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse notifications from localStorage", e);
        }
      } else {
        setNotifications([]);
      }

      // Check / request browser notification permission
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission().catch((err) => {
            console.error("Error requesting push permission", err);
          });
        }
      }
    } else {
      // Clear state on disconnect
      setNotifications([]);
      prevBalancesRef.current = {};
      notifiedEventsRef.current = new Set();
    }
  }, [isConnected, address]);

  // Persist notifications to localStorage whenever they change
  const saveNotifications = (updated: NotificationEvent[]) => {
    setNotifications(updated);
    if (address) {
      localStorage.setItem(`notifications-${address}`, JSON.stringify(updated));
    }
  };

  const addNotification = (notif: Omit<NotificationEvent, "id" | "timestamp" | "isRead">) => {
    const newNotif: NotificationEvent = {
      ...notif,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      isRead: false,
    };

    saveNotifications([newNotif, ...notifications]);

    // Browser Push Notification (only if doc is not visible)
    if (
      typeof window !== "undefined" &&
      document.visibilityState !== "visible" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      // Filter push conditions: dispute, milestone, or claimable > 0.001 sBTC (which is 100,000 micro-STX/sBTC)
      let shouldPush = false;
      if (newNotif.type === "dispute_raised" || newNotif.type === "milestone_released") {
        shouldPush = true;
      } else if (newNotif.type === "stream_claimable") {
        // Parse message or check amount if available.
        // For claimable > 0.001 sBTC / STX (100,000 micro-units, which is > 0.1 STX or sBTC equivalent)
        shouldPush = true;
      }

      if (shouldPush) {
        new Notification(newNotif.title, {
          body: newNotif.message,
          icon: "/logo.png",
        });
      }
    }
  };

  const markRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    saveNotifications(updated);
  };

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  // 1. WebSocket connection and subscription
  useEffect(() => {
    if (!isConnected || !address) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const wsUrl = apiUrl.replace(/^http/, "ws");

    let socket: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connectWs = () => {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsWsConnected(true);
        console.log("WebSocket connected to api server");

        // Fetch current active streams to subscribe to them
        fetchStreams({ address, limit: 100 })
          .then((res) => {
            const activeStreamIds = res.data
              .filter((s) => s.status === "active")
              .map((s) => parseInt(s.id, 10));

            activeStreamIds.forEach((id) => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "subscribe", streamId: id }));
              }
            });
          })
          .catch((err) => console.error("Error subscribing to streams", err));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.type === "stream-update") {
            const { streamId, event: contractEvent } = payload;
            const eventType = contractEvent.eventType;

            // Handle claimable updates
            if (eventType === "stream-claimed") {
              const claimedAmt = Number(contractEvent.claimedAmount || 0) / 1_000_000;
              addNotification({
                type: "stream_claimable",
                title: "Claimable Balance Updated",
                message: `Stream #${streamId} claimed ${claimedAmt.toFixed(4)} STX.`,
                streamId: streamId.toString(),
              });
            } else if (eventType === "milestone-released") {
              addNotification({
                type: "milestone_released",
                title: "Milestone Released",
                message: `A milestone has been released for Stream #${streamId}.`,
                streamId: streamId.toString(),
              });
            } else if (eventType === "dispute-raised") {
              addNotification({
                type: "dispute_raised",
                title: "Dispute Raised",
                message: `A dispute has been raised on Stream #${streamId}.`,
                streamId: streamId.toString(),
              });
            }
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message data", e);
        }
      };

      socket.onclose = () => {
        setIsWsConnected(false);
        console.log("WebSocket disconnected. Retrying connection in 5s...");
        reconnectTimer = setTimeout(connectWs, 5000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error", error);
        socket.close();
      };
    };

    connectWs();

    return () => {
      if (socket) {
        socket.close();
      }
      clearTimeout(reconnectTimer);
    };
  }, [isConnected, address]);

  // 2. Polling Fallback when WebSocket is disconnected
  useEffect(() => {
    if (!isConnected || !address || isWsConnected) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetchStreams({ recipient: address, limit: 100 });
        const incomingStreams = res.data;

        incomingStreams.forEach((stream) => {
          const streamId = stream.id;
          const currentClaimable = stream.balance?.claimableAmount || "0";
          const prevClaimable = prevBalancesRef.current[streamId];

          if (prevClaimable !== undefined && currentClaimable !== prevClaimable) {
            const currentNum = BigInt(currentClaimable);
            const prevNum = BigInt(prevClaimable);

            // Trigger notification if claimable balance increases
            if (currentNum > prevNum) {
              const diff = Number(currentNum - prevNum) / 1_000_000;
              addNotification({
                type: "stream_claimable",
                title: "Claimable balance updated",
                message: `Your claimable balance on Stream #${streamId} has increased by ${diff.toFixed(4)} STX.`,
                streamId,
              });
            }
          }
          prevBalancesRef.current[streamId] = currentClaimable;
        });
      } catch (err) {
        console.error("Failed to fetch streams during fallback polling", err);
      }
    }, 30000); // 30 seconds polling fallback

    return () => clearInterval(pollInterval);
  }, [isConnected, address, isWsConnected]);

  // 3. Expiry Warnings on Block Height changes / Mount
  useEffect(() => {
    if (!isConnected || !address || blockHeight <= 0) return;

    const checkExpiry = async () => {
      try {
        const res = await fetchStreams({ address, limit: 100 });
        const streams = res.data;

        streams.forEach((stream) => {
          if (stream.status !== "active") return;

          const startBlock = Number(stream.startBlock || 0);
          const rate = Number(stream.ratePerBlock || 0);
          const funded = Number(stream.fundedAmount || 0);
          const durationBlocks = rate > 0 ? funded / rate : 0;
          const endBlock = startBlock + Math.floor(durationBlocks);

          const blocksRemaining = endBlock - blockHeight;
          const expiringKey = `expiring-warn-${stream.id}`;
          const expiredKey = `expired-warn-${stream.id}`;

          // Warning: expires within 3 days (432 blocks)
          if (blocksRemaining > 0 && blocksRemaining <= 432) {
            if (!notifiedEventsRef.current.has(expiringKey)) {
              addNotification({
                type: "stream_expiring",
                title: "Stream Expiring Soon",
                message: `Stream #${stream.id} will expire in approximately ${Math.max(1, Math.round(blocksRemaining / 144))} days.`,
                streamId: stream.id,
              });
              notifiedEventsRef.current.add(expiringKey);
            }
          }

          // Warning: expired
          if (blocksRemaining <= 0) {
            if (!notifiedEventsRef.current.has(expiredKey)) {
              addNotification({
                type: "stream_expired",
                title: "Stream Expired",
                message: `Stream #${stream.id} has expired. Claim any remaining balances.`,
                streamId: stream.id,
              });
              notifiedEventsRef.current.add(expiredKey);
            }
          }
        });
      } catch (err) {
        console.error("Failed checking expiry warning", err);
      }
    };

    checkExpiry();
  }, [isConnected, address, blockHeight]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isWsConnected,
        panelOpen,
        setPanelOpen,
        markRead,
        markAllRead,
        clearAll,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
