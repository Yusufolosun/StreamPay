"use client";

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Clock, Loader2, ShieldAlert, ArrowRight, Shield } from "lucide-react";
import { useBnsName } from "../../hooks/useBnsName";
import { useContractCall } from "../../hooks/useContractCall";
import { useMilestoneDisputes } from "../../hooks/useMilestoneDisputes";
import { useToast } from "../Toast";
import { buildDisputeMilestone } from "../../lib/transactions";
import { truncateAddress, formatSTX } from "../../lib/validation";
import { fetchMilestoneStreams, type MilestoneStream, type Milestone } from "../../lib/api";

interface MilestoneSectionProps {
  address: string;
}

export function MilestoneSection({ address }: MilestoneSectionProps) {
  const { data: milestoneStreams, isLoading, refetch } = useQuery({
    queryKey: ["recipientMilestones", address],
    queryFn: () => fetchMilestoneStreams({ recipient: address }).then((res) => res.data || []),
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-orange mb-3" />
        <p className="text-sm">Loading milestone streams...</p>
      </div>
    );
  }

  if (!milestoneStreams || milestoneStreams.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card-bg p-8 text-center">
        <Shield className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-1">No Milestone Contracts</h3>
        <p className="text-sm text-text-secondary max-w-sm mx-auto">
          You don't have any incoming milestone-conditioned payment contracts at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {milestoneStreams.map((stream) => (
        <MilestoneStreamCard key={stream.id} stream={stream} onUpdate={refetch} />
      ))}
    </div>
  );
}

interface MilestoneStreamCardProps {
  stream: MilestoneStream;
  onUpdate: () => void;
}

function MilestoneStreamCardInner({ stream, onUpdate }: MilestoneStreamCardProps) {
  const { data: senderBns } = useBnsName(stream.sender);
  const { data: arbiterBns } = useBnsName(stream.arbiter);
  const tokenSymbol = stream.tokenContract?.toLowerCase().includes("sbtc") ? "sBTC" : "STX";

  // Fetch dispute statuses for each milestone from the blockchain
  const { data: disputeStatuses, refetch: refetchDisputes } = useMilestoneDisputes(
    stream.id,
    stream.milestones.length
  );

  return (
    <div className="rounded-xl border border-border bg-card-bg p-5 hover:border-violet/20 transition-all duration-300">
      {/* Stream Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Milestone Stream #{stream.id}
            </span>
            {stream.isCancelled && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                Cancelled
              </span>
            )}
            {!stream.isCancelled && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                Active
              </span>
            )}
          </div>
          <h4 className="font-semibold text-white text-base">
            Client: {senderBns || truncateAddress(stream.sender)}
          </h4>
          {stream.arbiter && (
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-violet" />
              Arbiter: {arbiterBns || truncateAddress(stream.arbiter)}
            </p>
          )}
        </div>

        <div className="text-right md:text-right flex flex-col items-start md:items-end justify-center">
          <span className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5">
            Total Locked Contract Value
          </span>
          <span className="font-mono text-xl font-bold text-violet bg-violet/5 border border-violet/10 px-3 py-1 rounded-lg">
            {formatSTX(Number(stream.totalAmount), 6)} {tokenSymbol}
          </span>
        </div>
      </div>

      {/* Milestones Stepper / List */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-white/75 mb-2">Contract Milestones</p>
        <div className="grid gap-3">
          {stream.milestones.map((milestone, index) => {
            const isDisputed = disputeStatuses?.[index] === true;
            return (
              <MilestoneRow
                key={index}
                streamId={stream.id}
                milestone={milestone}
                index={index}
                isDisputed={isDisputed}
                tokenSymbol={tokenSymbol}
                hasArbiter={!!stream.arbiter}
                isStreamCancelled={stream.isCancelled}
                onActionSuccess={() => {
                  refetchDisputes();
                  onUpdate();
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const MilestoneStreamCard = React.memo(MilestoneStreamCardInner);

interface MilestoneRowProps {
  streamId: number;
  milestone: Milestone;
  index: number;
  isDisputed: boolean;
  tokenSymbol: string;
  hasArbiter: boolean;
  isStreamCancelled: boolean;
  onActionSuccess: () => void;
}

function MilestoneRowInner({
  streamId,
  milestone,
  index,
  isDisputed,
  tokenSymbol,
  hasArbiter,
  isStreamCancelled,
  onActionSuccess,
}: MilestoneRowProps) {
  const { isLoading, execute } = useContractCall();
  const toast = useToast();
  const [signingState, setSigningState] = useState<"idle" | "signing" | "confirming">("idle");

  const handleDispute = useCallback(async () => {
    setSigningState("signing");
    const tx = buildDisputeMilestone(streamId, index);
    const txId = await execute(tx);
    if (txId) {
      setSigningState("confirming");
      toast.success(`Raised dispute for Milestone ${index + 1}: ${milestone.label}`, txId);
      setTimeout(() => {
        setSigningState("idle");
        onActionSuccess();
      }, 2000);
    } else {
      setSigningState("idle");
    }
  }, [streamId, index, execute, toast, milestone.label, onActionSuccess]);

  // Determine stage and styles
  let statusBadge = (
    <span className="flex items-center gap-1 text-xs text-text-secondary bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
      <Clock className="w-3.5 h-3.5" /> Pending
    </span>
  );

  if (milestone.isReleased) {
    statusBadge = (
      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3.5 h-3.5" /> Released
      </span>
    );
  } else if (isDisputed) {
    statusBadge = (
      <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
        <ShieldAlert className="w-3.5 h-3.5" /> Disputed
      </span>
    );
  }

  // A dispute can only be raised if:
  // - Milestone is NOT released
  // - Milestone is NOT already disputed
  // - Stream is NOT cancelled
  // - Stream has an arbiter
  const canDispute = !milestone.isReleased && !isDisputed && !isStreamCancelled && hasArbiter;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 transition-all">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-mono font-bold text-white shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{milestone.label}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {statusBadge}
            <span className="text-[10px] font-mono text-text-secondary">
              Weight: {(milestone.basisPoints / 100).toFixed(1)}%
            </span>
            {milestone.isReleased && milestone.releasedAt && (
              <span className="text-[10px] text-text-secondary">
                Block #{milestone.releasedAt}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t border-white/5 sm:border-0 pt-2.5 sm:pt-0">
        <div className="text-left sm:text-right">
          <p className="text-[9px] uppercase tracking-wider text-text-secondary">Milestone Payment</p>
          <p className="font-mono text-sm font-bold text-white">
            {formatSTX(Number(milestone.amount), 6)} {tokenSymbol}
          </p>
        </div>

        {canDispute && (
          <button
            onClick={handleDispute}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold"
          >
            {signingState === "signing" ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Signing...</>
            ) : signingState === "confirming" ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirming...</>
            ) : (
              <><AlertTriangle className="w-3.5 h-3.5" /> Raise Dispute</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

const MilestoneRow = React.memo(MilestoneRowInner);

export default MilestoneSection;
