"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Coins,
  Shield,
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileText,
  XCircle,
  HelpCircle,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useWallet } from "../../../hooks/useWallet";
import { useToast } from "../../../components/Toast";
import { fetchMilestoneStream } from "../../../lib/api";
import { formatSTX, formatDate } from "../../../lib/validation";
import { AddressDisplay } from "../../../components/AddressDisplay";
import { useContractCall } from "../../../hooks/useContractCall";
import { useMilestoneDisputes } from "../../../hooks/useMilestoneDisputes";
import {
  buildReleaseMilestone,
  buildDisputeMilestone,
  buildCancelMilestoneStream,
} from "../../../lib/transactions";
import { MilestoneStepper } from "../../../components/milestones/MilestoneStepper";
import { ArbiterDisputeModal } from "../../../components/milestones/ArbiterDisputeModal";

interface MilestoneDetailPageProps {
  params: {
    id: string;
  };
}

export default function MilestoneDetailPage({ params }: MilestoneDetailPageProps) {
  const streamIdNum = parseInt(params.id, 10);
  const { address, isConnected } = useWallet();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { execute, isLoading: isTxLoading } = useContractCall();
  const [activeDisputeIndex, setActiveDisputeIndex] = useState<number | null>(null);

  // Fetch milestone stream details
  const { data: stream, isLoading: isStreamLoading, error, refetch } = useQuery({
    queryKey: ["milestoneStream", streamIdNum],
    queryFn: () => fetchMilestoneStream(streamIdNum),
    enabled: !isNaN(streamIdNum),
    refetchInterval: 30000,
  });

  // Fetch dispute statuses for each milestone
  const { data: disputeStatuses, refetch: refetchDisputes } = useMilestoneDisputes(
    streamIdNum,
    stream?.milestones.length || 0
  );



  const tokenSymbol = stream?.tokenContract?.toLowerCase().includes("sbtc") ? "sBTC" : "STX";

  // Role detection
  const isClient = address === stream?.sender;
  const isFreelancer = address === stream?.recipient;
  const isArbiter = address === stream?.arbiter;

  // Calculate refund split (sum of all unreleased milestones)
  const refundSplit = useMemo(() => {
    if (!stream) return 0;
    return stream.milestones
      .filter((m) => !m.isReleased)
      .reduce((acc, m) => acc + Number(m.amount), 0);
  }, [stream]);

  // Actions
  const handleRelease = useCallback(
    async (milestoneIndex: number, label: string, amount: string) => {
      const tx = buildReleaseMilestone(streamIdNum, milestoneIndex);
      const txId = await execute(tx);
      if (txId) {
        toast.success(`Released milestone "${label}" (${formatSTX(Number(amount), 6)} ${tokenSymbol})`, txId);
        setTimeout(() => {
          refetch();
          refetchDisputes();
        }, 2000);
      }
    },
    [streamIdNum, execute, toast, tokenSymbol, refetch, refetchDisputes]
  );

  const handleDispute = useCallback(
    async (milestoneIndex: number, label: string) => {
      const tx = buildDisputeMilestone(streamIdNum, milestoneIndex);
      const txId = await execute(tx);
      if (txId) {
        toast.success(`Raised dispute for milestone "${label}"`, txId);
        setTimeout(() => {
          refetch();
          refetchDisputes();
        }, 2000);
      }
    },
    [streamIdNum, execute, toast, refetch, refetchDisputes]
  );

  const handleCancelStream = useCallback(async () => {
    if (refundSplit <= 0) return;
    const tx = buildCancelMilestoneStream(streamIdNum);
    const txId = await execute(tx);
    if (txId) {
      toast.success(`Cancelled contract. Refund of ${formatSTX(refundSplit, 6)} ${tokenSymbol} submitted.`, txId);
      setTimeout(() => {
        refetch();
        refetchDisputes();
      }, 2000);
    }
  }, [streamIdNum, execute, refundSplit, toast, tokenSymbol, refetch, refetchDisputes]);

  if (isNaN(streamIdNum)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-400">Invalid Milestone Contract ID.</p>
        <Link href="/milestones" className="text-orange hover:underline mt-4 inline-block text-sm">
          Return to Milestone List
        </Link>
      </div>
    );
  }

  if (isStreamLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-orange mb-3" />
        <p className="text-sm">Loading milestone contract...</p>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-400">Milestone Contract #{streamIdNum} not found or indexer unreachable.</p>
        <Link href="/milestones" className="text-orange hover:underline mt-4 inline-block text-sm">
          Return to Milestone List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Back link */}
      <div>
        <Link
          href="/milestones"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Milestone Payments
        </Link>
      </div>

      {/* Main Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detail Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card-bg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Milestone Contract Details
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Milestone Stream #{stream.id}
                </h2>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase border ${stream.isCancelled ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                {stream.isCancelled ? "Cancelled" : "Active"}
              </span>
            </div>

            {/* Stepper component */}
            <MilestoneStepper milestones={stream.milestones} disputeStatuses={disputeStatuses || []} />

            {/* Participants list */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-white/5 py-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                  Client (Sender)
                </span>
                <div className="font-mono text-xs text-white mt-1 font-semibold">
                  <AddressDisplay address={stream.sender} />
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                  Freelancer (Recipient)
                </span>
                <div className="font-mono text-xs text-white mt-1 font-semibold">
                  <AddressDisplay address={stream.recipient} />
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                  Designated Arbiter
                </span>
                <div className="font-mono text-xs text-white mt-1 font-semibold">
                  {stream.arbiter ? <AddressDisplay address={stream.arbiter} /> : "None"}
                </div>
              </div>
            </div>

            {/* Milestones list row */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Invoice Milestone Items</h3>
              <div className="divide-y divide-white/5">
                {stream.milestones.map((m, index) => {
                  const isReleased = m.isReleased;
                  const isDisputed = disputeStatuses?.[index] === true;
                  const canRelease = isClient && !isReleased && !isDisputed && !stream.isCancelled;
                  const canDispute = isFreelancer && !isReleased && !isDisputed && !stream.isCancelled && !!stream.arbiter;
                  const canResolve = isArbiter && isDisputed && !stream.isCancelled;

                  return (
                    <div
                      key={index}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/5 border border-white/5 text-[10px] font-mono flex items-center justify-center text-text-secondary font-bold">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-white text-sm">
                            {m.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 ml-7">
                          <span className="text-[10px] text-text-secondary">
                            Weight: {(m.basisPoints / 100).toFixed(0)}%
                          </span>
                          <span>•</span>
                          {isReleased ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                              <CheckCircle className="w-3 h-3" /> Released
                            </span>
                          ) : isDisputed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                              <ShieldAlert className="w-3 h-3 animate-pulse" /> Disputed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-secondary bg-white/5 px-2 py-0.5 rounded">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 ml-7 sm:ml-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[9px] uppercase tracking-wider text-text-secondary block">
                            Milestone Amount
                          </span>
                          <span className="font-mono text-sm font-bold text-white">
                            {formatSTX(Number(m.amount), 6)} {tokenSymbol}
                          </span>
                        </div>

                        {/* Actions */}
                        {canRelease && (
                          <button
                            onClick={() => handleRelease(index, m.label, m.amount)}
                            disabled={isTxLoading}
                            className="px-3.5 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold text-xs transition-all active:scale-95 disabled:opacity-45"
                          >
                            Release Funds
                          </button>
                        )}

                        {canDispute && (
                          <button
                            onClick={() => handleDispute(index, m.label)}
                            disabled={isTxLoading}
                            className="px-3.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold text-xs transition-all active:scale-95 disabled:opacity-45"
                          >
                            Raise Dispute
                          </button>
                        )}

                        {canResolve && (
                          <button
                            onClick={() => setActiveDisputeIndex(index)}
                            disabled={isTxLoading}
                            className="px-3.5 py-1.5 rounded-lg bg-violet text-white hover:bg-violet/90 font-semibold text-xs transition-all active:scale-95 disabled:opacity-45 shadow-md shadow-violet/15"
                          >
                            Resolve Dispute
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Cancel/Refund Split Panel (Right side) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card-bg p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-orange" />
              Contract Financials
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Total Value:</span>
                <span className="font-mono text-white font-semibold">
                  {formatSTX(Number(stream.totalAmount), 6)} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-text-secondary">Released:</span>
                <span className="font-mono text-green-400 font-semibold">
                  {formatSTX(
                    stream.milestones
                      .filter((m) => m.isReleased)
                      .reduce((acc, m) => acc + Number(m.amount), 0),
                    6
                  )}{" "}
                  {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-text-secondary">Refund Split (Unreleased):</span>
                <span className="font-mono text-orange font-bold">
                  {formatSTX(refundSplit, 6)} {tokenSymbol}
                </span>
              </div>
            </div>

            {/* Cancel Trigger for Client */}
            {isClient && !stream.isCancelled && refundSplit > 0 && (
              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-lg text-xs text-red-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Cancelling will release the remaining refund split amount of{" "}
                    <strong>
                      {formatSTX(refundSplit, 6)} {tokenSymbol}
                    </strong>{" "}
                    back to your wallet immediately. All active disputes must be resolved first.
                  </span>
                </div>
                <button
                  onClick={handleCancelStream}
                  disabled={isTxLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs border border-red-500/20 transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Contract & Refund
                </button>
              </div>
            )}
          </div>

          {/* Info details */}
          <div className="rounded-2xl border border-border bg-card-bg p-6 text-xs text-text-secondary space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">
              How Milestones Work
            </h4>
            <p>
              1. <strong>Release:</strong> The Client releases milestones to transfer locked funds to the Freelancer.
            </p>
            <p>
              2. <strong>Dispute:</strong> The Freelancer can raise a dispute on any pending milestone if work is complete but payment is delayed.
            </p>
            <p>
              3. <strong>Resolution:</strong> The designated Arbiter reviews disputes and decides whether to release funds to the Freelancer or refund to the Client.
            </p>
          </div>
        </div>
      </div>

      {/* Resolution Modal for Arbiter */}
      {activeDisputeIndex !== null && stream && (
        <ArbiterDisputeModal
          isOpen={activeDisputeIndex !== null}
          onClose={() => setActiveDisputeIndex(null)}
          streamId={stream.id}
          milestoneIndex={activeDisputeIndex}
          milestoneLabel={stream.milestones[activeDisputeIndex].label}
          milestoneAmount={stream.milestones[activeDisputeIndex].amount}
          tokenSymbol={tokenSymbol}
          onSuccess={() => {
            refetch();
            refetchDisputes();
          }}
        />
      )}
    </div>
  );
}
