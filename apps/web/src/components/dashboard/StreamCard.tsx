"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  XCircle,
  Loader2,
  Clock,
  Zap,
} from "lucide-react";
import { useContractCall } from "../../hooks/useContractCall";
import { useToast } from "../Toast";
import { AddressDisplay } from "../AddressDisplay";
import { BottomSheet } from "../ui/BottomSheet";
import {
  buildPauseStream,
  buildResumeStream,
  buildCancelStream,
} from "../../lib/transactions";
import { truncateAddress, formatSTX } from "../../lib/validation";
import { BLOCKS_PER_DAY } from "../../lib/constants";
import type { StreamView } from "../../lib/api";

interface StreamCardProps {
  stream: StreamView;
  onActionSuccess: () => void;
}

const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  paused: { label: "Paused", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  completed: { label: "Expired", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const TOKEN_BADGE: Record<string, { symbol: string; bg: string }> = {
  "": { symbol: "STX", bg: "bg-violet/10 text-violet" },
  sbtc: { symbol: "sBTC", bg: "bg-orange/10 text-orange" },
};

function getTokenBadge(tokenContract: string) {
  if (!tokenContract || tokenContract === "") return TOKEN_BADGE[""];
  if (tokenContract.toLowerCase().includes("sbtc")) return TOKEN_BADGE["sbtc"];
  return { symbol: tokenContract.split(".").pop() || "TOKEN", bg: "bg-blue-500/10 text-blue-400" };
}

function StreamCardInner({ stream, onActionSuccess }: StreamCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [liveStreamed, setLiveStreamed] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const { isLoading, execute, reset } = useContractCall();
  const toast = useToast();

  const statusCfg = STATUS_CONFIG[stream.status] || STATUS_CONFIG.completed;
  const tokenBadge = getTokenBadge(stream.tokenContract);

  const funded = Number(stream.fundedAmount || "0");
  const claimed = Number(stream.balance?.withdrawnAmount || "0");
  const ratePerBlock = Number(stream.ratePerBlock || "0");
  const ratePerDay = ratePerBlock * BLOCKS_PER_DAY;
  const startBlock = stream.startBlock;
  const currentBlock = stream.currentBlock;

  // End block calculation: funded / ratePerBlock + startBlock
  const totalBlocks = ratePerBlock > 0 ? funded / ratePerBlock : 0;
  const endBlock = startBlock + totalBlocks;
  const blocksRemaining = Math.max(0, endBlock - currentBlock);
  const daysRemaining = blocksRemaining / BLOCKS_PER_DAY;

  const progressPercent = funded > 0 ? Math.min(100, (claimed / funded) * 100) : 0;

  // Detect mobile viewport client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 640);
    }
  }, []);

  // Live counter: project streamed balance every second for active streams (60fps desktop, 30fps mobile)
  useEffect(() => {
    if (stream.status !== "active") {
      setLiveStreamed(claimed);
      return;
    }

    setLiveStreamed(claimed);

    const fps = isMobile ? 30 : 60;
    const intervalMs = 1000 / fps;

    const interval = setInterval(() => {
      setLiveStreamed((prev) => {
        const increment = (ratePerBlock / 600) * (intervalMs / 1000);
        const next = prev + increment;
        return Math.min(next, funded);
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [stream.status, claimed, ratePerBlock, funded, isMobile]);

  const handleAction = useCallback(
    async (action: "pause" | "resume" | "cancel") => {
      reset();
      const streamId = parseInt(stream.id, 10);
      let tx;
      if (action === "pause") tx = buildPauseStream(streamId);
      else if (action === "resume") tx = buildResumeStream(streamId);
      else tx = buildCancelStream(streamId);

      const txId = await execute(tx);
      if (txId) {
        toast.success(
          `Stream ${action === "cancel" ? "cancelled" : action === "pause" ? "paused" : "resumed"} successfully.`,
          txId
        );
        onActionSuccess();
      }
    },
    [stream.id, execute, reset, toast, onActionSuccess]
  );

  const handleToggleDetails = () => {
    if (window.innerWidth < 640) {
      setBottomSheetOpen(true);
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div className="group rounded-xl border border-border bg-card-bg hover:border-orange/20 transition-all duration-300">
      {/* Main card */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar placeholder */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange/20 to-violet/20 flex items-center justify-center text-xs font-bold text-white">
              {stream.recipient.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-white text-sm">
                <AddressDisplay address={stream.recipient} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${tokenBadge.bg}`}>
                  {tokenBadge.symbol}
                </span>
              </div>
            </div>
          </div>

          {/* Live counter */}
          <div className="text-right">
            <p className="text-xs text-text-secondary mb-0.5">Streamed so far</p>
            <p className="font-mono text-lg font-bold text-orange tabular-nums">
              {formatSTX(liveStreamed, 4)}
              <span className="text-xs text-text-secondary ml-1">STX</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 rounded-full bg-white/5 overflow-hidden mb-3">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange to-violet transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Remaining: <span className="text-white font-mono">{formatSTX(Math.max(0, funded - liveStreamed), 4)}</span></span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {formatSTX(ratePerBlock, 6)}/block · {formatSTX(ratePerDay, 2)}/day
          </span>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {blocksRemaining > 0
              ? `Ends in ${daysRemaining.toFixed(1)} days`
              : "Ended"}
          </span>
          <button
            onClick={handleToggleDetails}
            className="flex items-center gap-1 text-text-secondary hover:text-white transition-colors active:scale-95 duration-100 transition-transform"
            style={{ minHeight: 44, minWidth: 44 }}
          >
            {expanded ? "Less" : "Details"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded details & actions (Desktop/Tablet inline accordion) */}
      {expanded && (
        <div className="hidden sm:block border-t border-border px-5 py-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-text-secondary">Stream ID</p>
              <p className="font-mono text-white">{stream.id}</p>
            </div>
            <div>
              <p className="text-text-secondary">Start Block</p>
              <p className="font-mono text-white">{stream.startBlock}</p>
            </div>
            <div>
              <p className="text-text-secondary">Total Funded</p>
              <p className="font-mono text-white">{formatSTX(funded)} STX</p>
            </div>
            <div>
              <p className="text-text-secondary">Total Claimed</p>
              <p className="font-mono text-white">{formatSTX(claimed)} STX</p>
            </div>
          </div>

          {/* Actions */}
          {stream.status === "active" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("pause")}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/10 disabled:opacity-40 transition-all active:scale-95 duration-100 transition-transform"
                style={{ minHeight: 44 }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                Pause
              </button>
              <button
                onClick={() => handleAction("cancel")}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-semibold hover:bg-red-500/10 disabled:opacity-40 transition-all active:scale-95 duration-100 transition-transform"
                style={{ minHeight: 44 }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel
              </button>
            </div>
          )}

          {stream.status === "paused" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("resume")}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-green-500/20 bg-green-500/5 text-green-400 text-sm font-semibold hover:bg-green-500/10 disabled:opacity-40 transition-all active:scale-95 duration-100 transition-transform"
                style={{ minHeight: 44 }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Resume
              </button>
              <button
                onClick={() => handleAction("cancel")}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-semibold hover:bg-red-500/10 disabled:opacity-40 transition-all active:scale-95 duration-100 transition-transform"
                style={{ minHeight: 44 }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel
              </button>
            </div>
          )}

          {(stream.status === "cancelled" || stream.status === "completed") && (
            <p className="text-xs text-text-secondary text-center py-2">
              This stream has {stream.status === "cancelled" ? "been cancelled" : "expired"}. No actions available.
            </p>
          )}
        </div>
      )}

      {/* Slide-up Actions BottomSheet on Mobile */}
      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        title={`Stream #${stream.id}`}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-secondary text-xs">Recipient</p>
              <div className="font-mono text-white text-xs mt-1">
                <AddressDisplay address={stream.recipient} />
              </div>
            </div>
            <div>
              <p className="text-text-secondary text-xs">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border mt-1 ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <div>
              <p className="text-text-secondary text-xs">Start Block</p>
              <p className="font-mono text-white mt-1">{stream.startBlock}</p>
            </div>
            <div>
              <p className="text-text-secondary text-xs">End Block</p>
              <p className="font-mono text-white mt-1">{endBlock}</p>
            </div>
            <div>
              <p className="text-text-secondary text-xs">Total Funded</p>
              <p className="font-mono text-white mt-1">{formatSTX(funded)} STX</p>
            </div>
            <div>
              <p className="text-text-secondary text-xs">Total Claimed</p>
              <p className="font-mono text-white mt-1">{formatSTX(claimed)} STX</p>
            </div>
            <div>
              <p className="text-text-secondary text-xs">Rate</p>
              <p className="font-mono text-white mt-1">
                {formatSTX(ratePerBlock, 6)}/block
              </p>
            </div>
            <div>
              <p className="text-text-secondary text-xs">Remaining</p>
              <p className="font-mono text-white mt-1">
                {formatSTX(Math.max(0, funded - liveStreamed), 4)} STX
              </p>
            </div>
          </div>

          {/* Action buttons inside BottomSheet */}
          <div className="pt-2">
            {stream.status === "active" && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    handleAction("pause");
                    setBottomSheetOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/10 disabled:opacity-40 transition-all active:scale-95 duration-100 transition-transform"
                  style={{ minHeight: 44 }}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                  Pause Stream
                </button>
                <button
                  onClick={() => {
                    handleAction("cancel");
                    setBottomSheetOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-semibold hover:bg-red-500/10 disabled:opacity-40 transition-all active:scale-95 duration-100 transition-transform"
                  style={{ minHeight: 44 }}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Cancel Stream
                </button>
              </div>
            )}

            {stream.status === "paused" && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    handleAction("resume");
                    setBottomSheetOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-green-500/20 bg-green-500/5 text-green-400 text-sm font-semibold hover:bg-green-500/10 disabled:opacity-40 transition-all active:scale-95 duration-100 transition-transform"
                  style={{ minHeight: 44 }}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Resume Stream
                </button>
                <button
                  onClick={() => {
                    handleAction("cancel");
                    setBottomSheetOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-semibold hover:bg-red-500/10 disabled:opacity-40 transition-all active:scale-95 duration-100 transition-transform"
                  style={{ minHeight: 44 }}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Cancel Stream
                </button>
              </div>
            )}

            {(stream.status === "cancelled" || stream.status === "completed") && (
              <p className="text-xs text-text-secondary text-center py-2">
                This stream has {stream.status === "cancelled" ? "been cancelled" : "expired"}. No actions available.
              </p>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

export const StreamCard = React.memo(StreamCardInner);
export default StreamCard;
