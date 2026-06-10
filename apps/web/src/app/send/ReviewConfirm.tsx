"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Zap,
  Landmark,
} from "lucide-react";
import { useContractCall } from "../../hooks/useContractCall";
import { useWallet } from "../../hooks/useWallet";
import {
  buildCreateStream,
  buildCreateMilestoneStream,
} from "../../lib/transactions";
import type { StreamType, ContinuousFormData, MilestoneFormData } from "./page";

interface ReviewConfirmProps {
  streamType: StreamType;
  continuousData: ContinuousFormData | null;
  milestoneData: MilestoneFormData | null;
}

const BLOCKS_PER_DAY = 144;
const PROTOCOL_FEE_BPS = 25;

export const ReviewConfirm: React.FC<ReviewConfirmProps> = ({
  streamType,
  continuousData,
  milestoneData,
}) => {
  const { isConnected } = useWallet();
  const { isLoading, isSuccess, isError, error, txId, execute, reset } =
    useContractCall();

  const handleConfirm = async () => {
    if (streamType === "continuous" || streamType === "vesting") {
      if (!continuousData) return;

      const amountMicro = BigInt(
        Math.floor(parseFloat(continuousData.amount) * 1_000_000),
      );

      let durationBlocks: number;
      if (continuousData.durationPreset === "custom") {
        durationBlocks =
          parseInt(continuousData.customDuration, 10) * BLOCKS_PER_DAY;
      } else {
        const days = parseInt(continuousData.durationPreset, 10);
        durationBlocks = days * BLOCKS_PER_DAY;
      }

      const ratePerBlock = amountMicro / BigInt(durationBlocks);

      const tx = buildCreateStream({
        recipient: continuousData.recipient,
        amount: amountMicro,
        ratePerBlock,
        durationBlocks,
        tokenContract: continuousData.tokenContract || undefined,
      });

      await execute(tx);
    } else if (streamType === "milestone") {
      if (!milestoneData) return;

      const totalAmountMicro = BigInt(
        Math.floor(parseFloat(milestoneData.totalAmount) * 1_000_000),
      );

      const tx = buildCreateMilestoneStream({
        recipient: milestoneData.recipient,
        totalAmount: totalAmountMicro,
        milestones: milestoneData.milestones.map((m) => ({
          label: m.label,
          basisPoints: m.percentage * 100, // convert percentage to basis points
        })),
        arbiter: milestoneData.arbiter || undefined,
        tokenContract: milestoneData.tokenContract || undefined,
      });

      await execute(tx);
    }
  };

  // ── Success State ────────────────────────────────────────────────────
  if (isSuccess && txId) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Transaction Submitted!
        </h2>
        <p className="text-text-secondary mb-6">
          Your {streamType === "milestone" ? "milestone stream" : "stream"} has
          been submitted to the network.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-card-bg border border-border rounded-lg mb-8">
          <span className="text-xs text-text-secondary">TX ID:</span>
          <span className="font-mono text-sm text-white truncate max-w-[200px]">
            {txId}
          </span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <a
            href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange to-orange/80 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all"
          >
            View on Explorer
            <ExternalLink className="w-4 h-4" />
          </a>
          <Link
            href="/send"
            onClick={() => reset()}
            className="px-5 py-2.5 border border-border bg-card-bg text-white rounded-lg font-semibold text-sm hover:bg-white/5 transition-all"
          >
            Create Another
          </Link>
        </div>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────
  if (isError && error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Transaction Failed
        </h2>
        <p className="text-text-secondary mb-4 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => {
            reset();
            handleConfirm();
          }}
          className="px-5 py-2.5 bg-gradient-to-r from-orange to-orange/80 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Review State ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="p-6 bg-card-bg border border-border rounded-xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          {streamType === "milestone" ? (
            <div className="w-10 h-10 rounded-lg bg-violet/10 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-violet" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange" />
            </div>
          )}
          <div>
            <p className="font-bold text-white">
              {streamType === "milestone"
                ? "Milestone Invoice"
                : streamType === "vesting"
                ? "Vesting Schedule"
                : "Continuous Stream"}
            </p>
            <p className="text-xs text-text-secondary">
              Review the details below
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          {/* Continuous / Vesting summary */}
          {(streamType === "continuous" || streamType === "vesting") &&
            continuousData && (
              <>
                <Row
                  label="Recipient"
                  value={truncate(continuousData.recipient)}
                  mono
                />
                <Row
                  label="Token"
                  value={continuousData.tokenContract || "STX"}
                />
                <Row
                  label="Amount"
                  value={`${continuousData.amount} ${continuousData.tokenContract || "STX"}`}
                />
                <Row
                  label="Duration"
                  value={
                    continuousData.durationPreset === "custom"
                      ? `${continuousData.customDuration} days`
                      : continuousData.durationPreset
                  }
                />
                <Row
                  label="Rate per block"
                  value={`${(Number(continuousData.ratePerBlock) / 1_000_000).toFixed(6)} ${continuousData.tokenContract || "STX"}`}
                  mono
                />
                <Row
                  label="Protocol fee (0.25%)"
                  value={`${(Number(continuousData.protocolFee) / 1_000_000).toFixed(6)} ${continuousData.tokenContract || "STX"}`}
                  mono
                />
                <div className="border-t border-border pt-3">
                  <Row
                    label="Total you pay"
                    value={`${(Number(continuousData.totalCost) / 1_000_000).toFixed(6)} ${continuousData.tokenContract || "STX"}`}
                    mono
                    highlight
                  />
                </div>
              </>
            )}

          {/* Milestone summary */}
          {streamType === "milestone" && milestoneData && (
            <>
              <Row
                label="Recipient"
                value={truncate(milestoneData.recipient)}
                mono
              />
              <Row
                label="Token"
                value={milestoneData.tokenContract || "STX"}
              />
              <Row
                label="Total Amount"
                value={`${milestoneData.totalAmount} ${milestoneData.tokenContract || "STX"}`}
                mono
              />
              {milestoneData.arbiter && (
                <Row
                  label="Arbiter"
                  value={truncate(milestoneData.arbiter)}
                  mono
                />
              )}
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Milestones ({milestoneData.milestones.length})
                </p>
                {milestoneData.milestones.map((m, i) => {
                  const amt =
                    (parseFloat(milestoneData.totalAmount) * m.percentage) / 100;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-text-secondary">
                        {i + 1}. {m.label}
                      </span>
                      <span className="font-mono text-white">
                        {amt.toFixed(6)}{" "}
                        <span className="text-text-secondary text-xs">
                          ({m.percentage}%)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Gas estimate */}
        <div className="border-t border-border pt-3">
          <Row
            label="Estimated gas"
            value="~0.005 STX"
            mono
          />
        </div>
      </div>

      {/* Not connected warning */}
      {!isConnected && (
        <div className="p-4 bg-orange/5 border border-orange/20 rounded-lg flex items-start gap-3 text-sm text-orange">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            Connect your wallet to sign this transaction. Click the{" "}
            <strong>Connect Wallet</strong> button in the navigation bar.
          </p>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!isConnected || isLoading}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange to-violet text-white py-4 rounded-lg font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-violet/15"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Waiting for wallet...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Confirm &amp; Sign Transaction
          </>
        )}
      </button>
    </div>
  );
};

// ── Helpers ────────────────────────────────────────────────────────────

function truncate(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span
        className={
          highlight ? "font-semibold text-orange" : "text-text-secondary"
        }
      >
        {label}
      </span>
      <span
        className={`${mono ? "font-mono" : ""} ${
          highlight ? "font-bold text-orange" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
