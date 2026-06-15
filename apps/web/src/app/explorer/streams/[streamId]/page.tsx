"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  TrendingUp,
  Activity,
  ArrowRight,
  Shield,
  CornerDownRight,
} from "lucide-react";
import { fetchStream, fetchStreamHistory } from "../../../../lib/api";
import { formatSTX, formatDate } from "../../../../lib/validation";
import { AddressDisplay } from "../../../../components/AddressDisplay";

interface StreamDetailPageProps {
  params: {
    streamId: string;
  };
}

export default function StreamDetailPage({ params }: StreamDetailPageProps) {
  const streamIdNum = parseInt(params.streamId, 10);
  const [copied, setCopied] = useState(false);
  const [liveClaimable, setLiveClaimable] = useState(0);

  // Fetch Stream Details
  const { data: streamData, isLoading: isStreamLoading, error: streamError } = useQuery({
    queryKey: ["explorerStream", streamIdNum],
    queryFn: () => fetchStream(streamIdNum),
    enabled: !isNaN(streamIdNum),
    refetchInterval: 30000,
  });

  // Fetch Stream Event History
  const { data: historyEvents, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["explorerStreamHistory", streamIdNum],
    queryFn: () => fetchStreamHistory(streamIdNum),
    enabled: !isNaN(streamIdNum),
    refetchInterval: 30000,
  });

  const stream = streamData?.stream;
  const initialClaimable = Number(streamData?.claimableBalance || "0");



  const tokenSymbol = stream?.tokenContract?.toLowerCase().includes("sbtc") ? "sBTC" : "STX";

  // Live balance counter projection
  useEffect(() => {
    if (!stream) return;
    setLiveClaimable(initialClaimable);

    if (stream.status !== "active") return;
    const ratePerBlock = Number(stream.ratePerBlock || "0");
    const funded = Number(stream.fundedAmount || "0");
    const claimed = Number(stream.withdrawnAmount || "0");

    const startTime = Date.now();
    const interval = setInterval(() => {
      const secondsElapsed = (Date.now() - startTime) / 1000;
      const ratePerSecond = ratePerBlock / 600;
      const extra = ratePerSecond * secondsElapsed;
      const maxExtra = Math.max(0, funded - claimed - initialClaimable);
      setLiveClaimable(initialClaimable + Math.min(extra, maxExtra));
    }, 1000);

    return () => clearInterval(interval);
  }, [stream, initialClaimable]);

  // Copy details link helper
  const handleCopyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (isNaN(streamIdNum)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-400">Invalid Stream ID specified.</p>
        <Link href="/explorer" className="text-orange hover:underline mt-4 inline-block text-sm">
          Return to Explorer
        </Link>
      </div>
    );
  }

  if (isStreamLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-orange mb-3" />
        <p className="text-sm">Loading stream details...</p>
      </div>
    );
  }

  if (streamError || !stream) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-400">Stream #{streamIdNum} could not be found or indexer is unreachable.</p>
        <Link href="/explorer" className="text-orange hover:underline mt-4 inline-block text-sm">
          Return to Explorer
        </Link>
      </div>
    );
  }

  const funded = Number(stream.fundedAmount || "0");
  const claimed = Number(stream.withdrawnAmount || "0");
  const ratePerBlock = Number(stream.ratePerBlock || "0");
  const ratePerDay = ratePerBlock * 144;
  const progressPercent = funded > 0 ? Math.min(100, (claimed / funded) * 100) : 0;
  const totalBlocks = ratePerBlock > 0 ? funded / ratePerBlock : 0;
  const endBlock = Math.floor(stream.startBlock + totalBlocks);

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-green-500/10 text-green-400 border-green-500/20" },
    paused: { label: "Paused", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    completed: { label: "Expired", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  };

  const statusCfg = STATUS_CONFIG[stream.status] || STATUS_CONFIG.completed;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link
          href="/explorer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explorer
        </Link>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border bg-card-bg hover:bg-opacity-80 rounded-lg text-text-secondary hover:text-white transition-all active:scale-[0.98]"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 font-medium">Copied Link!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Share Link</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details and Live Hero (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Balance Hero */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg/60 p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-orange/15 to-violet/15 rounded-full blur-2xl pointer-events-none" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Projected Live Claimable Balance
            </span>
            <div className="my-4">
              <h2 className="font-mono text-3xl sm:text-4xl font-black text-white tabular-nums">
                {formatSTX(liveClaimable, 6)} <span className="text-orange text-xl sm:text-2xl">{tokenSymbol}</span>
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span>Rate: <span className="font-semibold text-white">{formatSTX(ratePerDay, 2)}/day</span></span>
              <span>•</span>
              <span>Total Funded: <span className="font-semibold text-white">{formatSTX(funded, 4)} {tokenSymbol}</span></span>
            </div>
          </div>

          {/* Stream Metadata Card */}
          <div className="rounded-2xl border border-border bg-card-bg p-6 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-orange" />
              Stream Configuration Metadata
            </h3>

            {/* Progress Visual */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-text-secondary">
                <span>Total Stream Progress</span>
                <span className="text-white font-semibold">{progressPercent.toFixed(1)}% Claimed</span>
              </div>
              <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange to-violet transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                <span>Withdrawn: {formatSTX(claimed, 4)} {tokenSymbol}</span>
                <span>Remaining: {formatSTX(funded - claimed, 4)} {tokenSymbol}</span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-text-secondary">Sender Address</span>
                <div className="font-mono text-white text-xs bg-white/2 border border-white/5 p-2 rounded-lg break-all">
                  <AddressDisplay address={stream.sender} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-text-secondary">Recipient Address</span>
                <div className="font-mono text-white text-xs bg-white/2 border border-white/5 p-2 rounded-lg break-all">
                  <AddressDisplay address={stream.recipient} />
                </div>
              </div>
              <div className="space-y-1 border-t border-white/5 pt-3">
                <span className="text-xs text-text-secondary">Start Block</span>
                <p className="font-mono font-semibold text-white">Block #{stream.startBlock}</p>
              </div>
              <div className="space-y-1 border-t border-white/5 pt-3">
                <span className="text-xs text-text-secondary">End Block</span>
                <p className="font-mono font-semibold text-white">Block #{endBlock}</p>
              </div>
              <div className="space-y-1 border-t border-white/5 pt-3">
                <span className="text-xs text-text-secondary">Created Block Time</span>
                <p className="font-mono font-semibold text-white flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                  {formatDate(stream.createdAt)}
                </p>
              </div>
              <div className="space-y-1 border-t border-white/5 pt-3">
                <span className="text-xs text-text-secondary">Current Status</span>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Timeline (Right 1 col) */}
        <div className="rounded-2xl border border-border bg-card-bg p-6 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet" />
            Blockchain Log Timeline
          </h3>

          {isHistoryLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Loader2 className="w-6 h-6 animate-spin text-violet mb-2" />
              <p className="text-xs">Loading event timeline...</p>
            </div>
          ) : !historyEvents || historyEvents.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-8">
              No indexer event logs recorded for this stream.
            </p>
          ) : (
            <div className="relative border-l border-white/10 ml-3.5 pl-5 space-y-6">
              {historyEvents.map((event, index) => {
                const isCreated = event.eventType === "stream-created";
                const isClaimed = event.eventType === "stream-claimed";
                const isPaused = event.eventType === "stream-paused";
                const isResumed = event.eventType === "stream-resumed";
                const isCancelled = event.eventType === "stream-cancelled";

                let eventColor = "bg-white/10 ring-white/5";
                let eventLabel = event.eventType;

                if (isCreated) {
                  eventColor = "bg-green-500/20 ring-green-500/10 text-green-400";
                  eventLabel = "Created";
                } else if (isClaimed) {
                  eventColor = "bg-orange/20 ring-orange/15 text-orange";
                  eventLabel = "Balance Claimed";
                } else if (isPaused) {
                  eventColor = "bg-yellow-500/20 ring-yellow-500/10 text-yellow-400";
                  eventLabel = "Paused";
                } else if (isResumed) {
                  eventColor = "bg-teal-500/20 ring-teal-500/10 text-teal-400";
                  eventLabel = "Resumed";
                } else if (isCancelled) {
                  eventColor = "bg-red-500/20 ring-red-500/10 text-red-400";
                  eventLabel = "Cancelled";
                }

                return (
                  <div key={index} className="relative group">
                    {/* Node Dot */}
                    <div className={`absolute -left-8.5 top-1.5 w-6.5 h-6.5 rounded-full flex items-center justify-center text-[9px] font-bold ring-4 ${eventColor} transition-transform group-hover:scale-105`}>
                      {index + 1}
                    </div>

                    {/* Node Content */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">
                          {eventLabel}
                        </span>
                        <span className="font-mono text-[9px] text-text-secondary bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                          Block #{event.blockHeight}
                        </span>
                      </div>

                      {/* Display detail specific fields */}
                      {isCreated && event.amount && (
                        <p className="text-[10px] text-text-secondary">
                          Deposited: <span className="text-white font-mono">{formatSTX(Number(event.amount), 6)} {tokenSymbol}</span>
                        </p>
                      )}
                      {isClaimed && event.claimedAmount && (
                        <p className="text-[10px] text-text-secondary">
                          Claimed: <span className="text-white font-mono">{formatSTX(Number(event.claimedAmount), 6)} {tokenSymbol}</span>
                        </p>
                      )}
                      {isCancelled && (
                        <p className="text-[10px] text-text-secondary">
                          Stream cancelled and remaining balances refunded.
                        </p>
                      )}

                      {/* Tx ID link */}
                      {event.txId && (
                        <a
                          href={`https://explorer.hiro.so/txid/${event.txId}?chain=testnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-orange hover:underline mt-1"
                        >
                          View Transaction
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
