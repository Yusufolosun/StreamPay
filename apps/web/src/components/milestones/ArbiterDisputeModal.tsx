"use client";

import React, { useState, useCallback } from "react";
import { X, Shield, ArrowRight, Loader2, CheckCircle, RefreshCcw } from "lucide-react";
import { useContractCall } from "../../hooks/useContractCall";
import { useToast } from "../Toast";
import { buildResolveDispute } from "../../lib/transactions";
import { formatSTX } from "../../lib/validation";

interface ArbiterDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: number;
  milestoneIndex: number;
  milestoneLabel: string;
  milestoneAmount: string;
  tokenSymbol: string;
  onSuccess: () => void;
}

export function ArbiterDisputeModal({
  isOpen,
  onClose,
  streamId,
  milestoneIndex,
  milestoneLabel,
  milestoneAmount,
  tokenSymbol,
  onSuccess,
}: ArbiterDisputeModalProps) {
  const [resolveToRecipient, setResolveToRecipient] = useState<boolean>(true);
  const { isLoading, execute } = useContractCall();
  const toast = useToast();
  const [signingState, setSigningState] = useState<"idle" | "signing" | "confirming">("idle");

  const handleResolve = useCallback(async () => {
    setSigningState("signing");
    const tx = buildResolveDispute(streamId, milestoneIndex, resolveToRecipient);
    const txId = await execute(tx);

    if (txId) {
      setSigningState("confirming");
      toast.success(
        `Dispute resolved: Funds ${resolveToRecipient ? "released to Recipient" : "refunded to Sender"}`,
        txId
      );
      setTimeout(() => {
        setSigningState("idle");
        onSuccess();
        onClose();
      }, 2000);
    } else {
      setSigningState("idle");
    }
  }, [streamId, milestoneIndex, resolveToRecipient, execute, toast, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card-bg border border-border rounded-xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-violet/10 border border-violet/20 rounded-lg text-violet">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Arbiter Resolution</h3>
            <p className="text-xs text-text-secondary">Milestone Stream #{streamId}</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white/2 border border-white/5 rounded-lg p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Disputed Milestone:</span>
            <span className="text-white font-semibold">#{milestoneIndex + 1} ({milestoneLabel})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Milestone Value:</span>
            <span className="text-white font-bold font-mono">
              {formatSTX(Number(milestoneAmount), 6)} {tokenSymbol}
            </span>
          </div>
        </div>

        {/* Resolution Options */}
        <div className="space-y-4 mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
            Select Resolution Outcome
          </label>

          {/* Option A: Release to Recipient */}
          <div
            onClick={() => setResolveToRecipient(true)}
            className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
              resolveToRecipient
                ? "bg-green-500/10 border-green-500 text-white"
                : "bg-white/2 border-white/5 text-text-secondary hover:bg-white/5"
            }`}
          >
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${resolveToRecipient ? "border-green-500" : "border-white/20"}`}>
              {resolveToRecipient && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
            </div>
            <div>
              <p className="font-semibold text-sm">Release Funds to Recipient</p>
              <p className="text-xs text-text-secondary mt-1">
                The full milestone payment will be released directly to the freelancer / recipient's wallet.
              </p>
            </div>
          </div>

          {/* Option B: Refund to Sender */}
          <div
            onClick={() => setResolveToRecipient(false)}
            className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
              !resolveToRecipient
                ? "bg-orange/10 border-orange text-white"
                : "bg-white/2 border-white/5 text-text-secondary hover:bg-white/5"
            }`}
          >
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${!resolveToRecipient ? "border-orange" : "border-white/20"}`}>
              {!resolveToRecipient && <div className="w-2.5 h-2.5 rounded-full bg-orange" />}
            </div>
            <div>
              <p className="font-semibold text-sm">Refund Funds to Sender</p>
              <p className="text-xs text-text-secondary mt-1">
                The milestone payment will be returned back to the client / sender's wallet.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold border border-border bg-card-bg hover:bg-opacity-80 rounded-lg text-text-secondary hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-orange to-violet text-white font-semibold text-sm hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-violet/10"
          >
            {signingState === "signing" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Signing...</>
            ) : signingState === "confirming" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Resolve Dispute
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArbiterDisputeModal;
