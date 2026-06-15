"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download, Loader2, Zap } from "lucide-react";
import { AddressDisplay } from "../AddressDisplay";
import { useContractCall } from "../../hooks/useContractCall";
import { useToast } from "../Toast";
import { buildClaimStream } from "../../lib/transactions";
import { truncateAddress, formatSTX } from "../../lib/validation";
import { BLOCKS_PER_DAY } from "../../lib/constants";
import type { StreamView } from "../../lib/api";

interface IncomeStreamCardProps {
  stream: StreamView;
  onClaimSuccess: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  paused: { label: "Paused", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  completed: { label: "Expired", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

function IncomeStreamCardInner({ stream, onClaimSuccess }: IncomeStreamCardProps) {
  const { isLoading, execute, reset } = useContractCall();
  const toast = useToast();
  const [liveClaimable, setLiveClaimable] = useState(0);
  const [signingState, setSigningState] = useState<"idle" | "signing" | "confirming">("idle");
  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const statusCfg = STATUS_CONFIG[stream.status] || STATUS_CONFIG.completed;
  const ratePerBlock = Number(stream.ratePerBlock || "0");
  const funded = Number(stream.fundedAmount || "0");
  const claimed = Number(stream.balance?.withdrawnAmount || "0");
  const claimable = Number(stream.balance?.claimableAmount || "0");
  const ratePerDay = ratePerBlock * BLOCKS_PER_DAY;
  const progressPercent = funded > 0 ? Math.min(100, (claimed / funded) * 100) : 0;

  const tokenSymbol = stream.tokenContract?.toLowerCase().includes("sbtc") ? "sBTC" : "STX";

  // Detect mobile viewport client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 640);
    }
  }, []);

  // Live incrementing claimable balance (60fps desktop, 30fps mobile)
  useEffect(() => {
    setLiveClaimable(claimable);
    if (stream.status !== "active" || ratePerBlock <= 0) return;

    const fps = isMobile ? 30 : 60;
    const intervalMs = 1000 / fps;

    const interval = setInterval(() => {
      setLiveClaimable((prev) => {
        const increment = (ratePerBlock / 600) * (intervalMs / 1000);
        return Math.min(prev + increment, funded - claimed);
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [stream.status, claimable, ratePerBlock, funded, claimed, isMobile]);

  const handleClaim = useCallback(async () => {
    if (liveClaimable <= 0) return;
    reset();
    setSigningState("signing");
    const streamId = parseInt(stream.id, 10);
    const tx = buildClaimStream(streamId);
    const txId = await execute(tx);
    if (txId) {
      setSigningState("confirming");
      toast.success(`Claimed ${formatSTX(liveClaimable, 6)} ${tokenSymbol}`, txId);
      setTimeout(() => {
        setSigningState("idle");
        onClaimSuccess();
      }, 2000);
    } else {
      setSigningState("idle");
    }
  }, [stream.id, liveClaimable, execute, reset, toast, onClaimSuccess, tokenSymbol]);

  return (
    <div className="rounded-xl border border-border bg-card-bg hover:border-orange/20 transition-all duration-300 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet/20 to-orange/20 flex items-center justify-center text-xs font-bold text-white">
            {stream.sender.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white text-sm flex items-center gap-1">
              <span>From:</span>
              <AddressDisplay address={stream.sender} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange/10 text-orange">
                {tokenSymbol}
              </span>
            </div>
          </div>
        </div>

        {/* Live claimable */}
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5">Claimable</p>
          <p className="font-mono text-xl font-bold text-orange tabular-nums">
            {formatSTX(liveClaimable, 6)}
          </p>
        </div>
      </div>

      {/* Details Toggle Button on Mobile */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="sm:hidden flex items-center justify-center gap-1 text-xs text-text-secondary hover:text-white mb-3 w-full border border-dashed border-border py-2.5 rounded-lg active:scale-95 duration-100 transition-transform font-semibold"
        style={{ minHeight: 44 }}
      >
        {showDetails ? "Hide Details" : "Show Details"}
      </button>

      {/* Progress bar */}
      <div className={`relative h-1.5 rounded-full bg-white/5 overflow-hidden mb-3 ${showDetails ? "block" : "hidden sm:block"}`}>
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange to-violet transition-all duration-1000"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className={`flex items-center justify-between text-xs text-text-secondary mb-4 ${showDetails ? "flex" : "hidden sm:flex"}`}>
        <span>Total received: <span className="text-white font-mono">{formatSTX(claimed, 4)} {tokenSymbol}</span></span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {formatSTX(ratePerDay, 2)}/day
        </span>
      </div>

      {/* Claim button */}
      <button
        onClick={handleClaim}
        disabled={liveClaimable <= 0 || isLoading}
        title="Exact amount confirmed by the blockchain — displayed amount is projected."
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-orange to-orange/80 text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 duration-100 transition-transform shadow-lg shadow-orange/15"
        style={{ minHeight: 44 }}
      >
        {signingState === "signing" ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Signing...</>
        ) : signingState === "confirming" ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
        ) : (
          <><Download className="w-4 h-4" /> Claim {formatSTX(liveClaimable, 6)} {tokenSymbol}</>
        )}
      </button>
    </div>
  );
}

export const IncomeStreamCard = React.memo(IncomeStreamCardInner);
export default IncomeStreamCard;
