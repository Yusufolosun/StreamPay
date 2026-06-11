"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Inbox,
  Download,
  Loader2,
  Coins,
  FileText,
  Activity,
  Wifi,
  WifiOff,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { useWallet } from "../../hooks/useWallet";
import { useToast } from "../../components/Toast";
import { fetchStreams, fetchMilestoneStreams } from "../../lib/api";
import { formatSTX } from "../../lib/validation";
import { buildClaimStream } from "../../lib/transactions";
import { useContractCall } from "../../hooks/useContractCall";
import { IncomeStreamCard } from "../../components/receive/IncomeStreamCard";
import { MilestoneSection } from "../../components/receive/MilestoneSection";

export default function ReceivePage() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"standard" | "milestones">("standard");
  const [totalLiveClaimable, setTotalLiveClaimable] = useState(0);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [claimProgress, setClaimProgress] = useState<{
    current: number;
    total: number;
    streamId: string | null;
  } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const { execute: executeClaim, isLoading: isClaimingMultiple } = useContractCall();

  // Fetch standard streams where user is recipient
  const {
    data: incomingStreams,
    isLoading: isStreamsLoading,
    refetch: refetchIncomingStreams,
  } = useQuery({
    queryKey: ["recipientStreams", address],
    queryFn: () => fetchStreams({ recipient: address || "" }).then((res) => res.data || []),
    enabled: !!address,
    refetchInterval: 30000,
  });

  // Fetch milestone streams where user is recipient to know count (for tab count badge)
  const { data: milestoneStreams, refetch: refetchMilestones } = useQuery({
    queryKey: ["recipientMilestones", address],
    queryFn: () => fetchMilestoneStreams({ recipient: address || "" }).then((res) => res.data || []),
    enabled: !!address,
    refetchInterval: 30000,
  });

  // Calculate live incrementing total claimable STX balance across all incoming active/paused streams
  useEffect(() => {
    if (!incomingStreams || incomingStreams.length === 0) {
      setTotalLiveClaimable(0);
      return;
    }

    const initial = incomingStreams.reduce((acc, s) => {
      // Only sum up STX streams in the main hero balance display
      if (s.tokenContract && s.tokenContract.toLowerCase().includes("sbtc")) {
        return acc;
      }
      return acc + Number(s.balance?.claimableAmount || "0");
    }, 0);

    setTotalLiveClaimable(initial);

    const activeStxStreams = incomingStreams.filter(
      (s) => s.status === "active" && (!s.tokenContract || !s.tokenContract.toLowerCase().includes("sbtc"))
    );

    if (activeStxStreams.length === 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const secondsElapsed = (Date.now() - startTime) / 1000;
      let extra = 0;
      activeStxStreams.forEach((s) => {
        const ratePerBlock = Number(s.ratePerBlock || "0");
        const funded = Number(s.fundedAmount || "0");
        const claimed = Number(s.balance?.withdrawnAmount || "0");
        const claimable = Number(s.balance?.claimableAmount || "0");
        const ratePerSecond = ratePerBlock / 600; // ~600 seconds per block
        const projectedExtra = ratePerSecond * secondsElapsed;
        const maxExtra = Math.max(0, funded - claimed - claimable);
        extra += Math.min(projectedExtra, maxExtra);
      });
      setTotalLiveClaimable(initial + extra);
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingStreams]);

  // WebSocket implementation invalidating query caches on updates
  useEffect(() => {
    if (!address) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      try {
        setWsStatus("connecting");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const wsUrl = apiUrl.replace(/^http/, "ws");
        
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log("WebSocket connected to api server");
          setWsStatus("connected");
          
          // Send subscribe messages for each stream
          if (incomingStreams) {
            incomingStreams.forEach((s) => {
              socket?.send(JSON.stringify({ type: "subscribe", streamId: parseInt(s.id, 10) }));
            });
          }
          if (milestoneStreams) {
            milestoneStreams.forEach((s) => {
              socket?.send(JSON.stringify({ type: "subscribe", streamId: s.id }));
            });
          }
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "stream-update") {
              console.log("WebSocket received stream update message:", data);
              queryClient.invalidateQueries({ queryKey: ["recipientStreams"] });
              queryClient.invalidateQueries({ queryKey: ["recipientMilestones"] });
            }
          } catch (e) {
            console.error("Failed to parse WebSocket message data", e);
          }
        };

        socket.onclose = () => {
          console.log("WebSocket connection closed. Retrying...");
          setWsStatus("disconnected");
          reconnectTimeout = setTimeout(connectWS, 5000);
        };

        socket.onerror = (err) => {
          console.error("WebSocket connection encountered error:", err);
          socket?.close();
        };
      } catch (err) {
        console.error("WebSocket connection setup failed", err);
        setWsStatus("disconnected");
        reconnectTimeout = setTimeout(connectWS, 5000);
      }
    };

    connectWS();

    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [address, queryClient, incomingStreams, milestoneStreams]);

  // Filter streams that have claimable balances above 0
  const streamsToClaim = useMemo(() => {
    if (!incomingStreams) return [];
    return incomingStreams.filter((s) => {
      const claimable = Number(s.balance?.claimableAmount || "0");
      return claimable > 0 && (s.status === "active" || s.status === "paused");
    });
  }, [incomingStreams]);

  // Sequential Claim All handler
  const handleClaimAll = async () => {
    if (streamsToClaim.length === 0) return;

    setClaimProgress({ current: 0, total: streamsToClaim.length, streamId: null });

    for (let i = 0; i < streamsToClaim.length; i++) {
      const stream = streamsToClaim[i];
      const streamId = parseInt(stream.id, 10);
      setClaimProgress({ current: i, total: streamsToClaim.length, streamId: stream.id });

      try {
        const tokenSymbol = stream.tokenContract?.toLowerCase().includes("sbtc") ? "sBTC" : "STX";
        const claimableVal = Number(stream.balance?.claimableAmount || "0");
        
        toast.toast({
          type: "info",
          title: "Signing Request",
          message: `Please sign to claim ${formatSTX(claimableVal, 6)} ${tokenSymbol} from stream #${stream.id}.`,
        });

        const tx = buildClaimStream(streamId);
        const txId = await executeClaim(tx);

        if (txId) {
          toast.success(`Claim submitted for stream #${stream.id}.`, txId);
          // Wait 2s to allow browser wallets to settle before opening the next transaction prompt
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          toast.error(`Claim for stream #${stream.id} was aborted or rejected.`);
          break; // Stop loop immediately to prevent further popups
        }
      } catch (err) {
        console.error("Failed to claim stream sequentially", stream.id, err);
        toast.error(`Sequence halted: Failed to claim stream #${stream.id}.`);
        break;
      }
    }

    setClaimProgress(null);
    refetchIncomingStreams();
    refetchMilestones();
  };

  if (!isConnected || !address) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange/20 to-violet/20 flex items-center justify-center text-orange mx-auto mb-6 border border-orange/15 shadow-xl shadow-orange/5">
          <Inbox className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Connected Wallet Required</h2>
        <p className="text-text-secondary text-sm mb-6 max-w-xs mx-auto">
          Please connect your Stacks wallet to monitor your incoming standard payment streams and milestone-based payments.
        </p>
        <button
          onClick={() => connect("leather")}
          className="w-full bg-gradient-to-r from-orange to-violet text-white py-3 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-violet/15"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Upper Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Large Monospace Hero Card */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg/70 p-6 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-orange/10 to-violet/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4 z-10">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                Total Live Claimable STX
              </h3>
              <p className="text-xs text-text-secondary/80 mt-0.5">
                Real-time projection from active incoming streams
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-text-secondary font-medium">
              {wsStatus === "connected" ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Live Updates</span>
                </>
              ) : wsStatus === "connecting" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400">Sync Suspended</span>
                </>
              )}
            </div>
          </div>

          <div className="my-2 z-10">
            <h1 className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-white tabular-nums">
              {formatSTX(totalLiveClaimable, 6)} <span className="text-orange text-2xl sm:text-3xl">STX</span>
            </h1>
          </div>

          {/* Sequential Claim Button */}
          {streamsToClaim.length > 0 && (
            <div className="mt-4 z-10">
              <button
                onClick={handleClaimAll}
                disabled={isClaimingMultiple}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-orange to-violet text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange/10 w-full sm:w-auto"
              >
                {claimProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Claiming {claimProgress.current + 1} of {claimProgress.total}...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Claim All ({streamsToClaim.length} streams)
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Small Stats Info Card */}
        <div className="rounded-2xl border border-border bg-card-bg p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Dashboard Status
            </h4>
            <Activity className="w-5 h-5 text-violet" />
          </div>
          <div className="space-y-4 my-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Connected Account:</span>
              <span className="font-mono text-white text-xs font-semibold">
                {address.slice(0, 8)}...{address.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Standard Streams:</span>
              <span className="text-white font-semibold">{incomingStreams?.length || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Milestone Contracts:</span>
              <span className="text-white font-semibold">{milestoneStreams?.length || 0}</span>
            </div>
          </div>
          <div className="text-[10px] text-text-secondary flex items-start gap-1.5 bg-white/2 border border-white/5 p-2 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange shrink-0 mt-0.5" />
            <span>
              Real-time projections show estimated balances. Block confirmation times vary.
            </span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("standard")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === "standard"
              ? "border-orange text-white"
              : "border-transparent text-text-secondary hover:text-white"
          }`}
        >
          <Coins className="w-4 h-4" />
          Standard Streams
          {incomingStreams && incomingStreams.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white/10 text-xs text-text-secondary font-medium">
              {incomingStreams.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("milestones")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === "milestones"
              ? "border-orange text-white"
              : "border-transparent text-text-secondary hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          Milestone Contracts
          {milestoneStreams && milestoneStreams.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white/10 text-xs text-text-secondary font-medium">
              {milestoneStreams.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "standard" && (
          <div>
            {isStreamsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                <Loader2 className="w-8 h-8 animate-spin text-orange mb-3" />
                <p className="text-sm">Loading standard streams...</p>
              </div>
            ) : !incomingStreams || incomingStreams.length === 0 ? (
              <div className="rounded-xl border border-border bg-card-bg p-8 text-center max-w-lg mx-auto mt-6">
                <Inbox className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">No Incoming Streams</h3>
                <p className="text-sm text-text-secondary max-w-sm mx-auto">
                  You don't have any incoming standard payment streams at the moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {incomingStreams.map((stream) => (
                  <IncomeStreamCard
                    key={stream.id}
                    stream={stream}
                    onClaimSuccess={() => {
                      refetchIncomingStreams();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "milestones" && <MilestoneSection address={address} />}
      </div>
    </div>
  );
}
