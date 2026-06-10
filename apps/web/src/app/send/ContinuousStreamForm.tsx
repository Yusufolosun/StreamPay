"use client";

import React, { useState, useMemo } from "react";
import { CheckCircle2, XCircle, ArrowRight, Info } from "lucide-react";
import type { ContinuousFormData } from "./page";

interface ContinuousStreamFormProps {
  onSubmit: (data: ContinuousFormData) => void;
}

const BLOCKS_PER_MINUTE = 1; // ~10 min per Stacks block, simplified for estimation
const BLOCKS_PER_DAY = 144;
const PROTOCOL_FEE_BPS = 25; // 0.25%
const MIN_AMOUNT = 1000n; // 1000 microSTX

const DURATION_PRESETS = [
  { label: "7d", blocks: 7 * BLOCKS_PER_DAY },
  { label: "14d", blocks: 14 * BLOCKS_PER_DAY },
  { label: "30d", blocks: 30 * BLOCKS_PER_DAY },
  { label: "90d", blocks: 90 * BLOCKS_PER_DAY },
];

const TOKEN_OPTIONS = [
  { symbol: "STX", name: "Stacks", contract: "", icon: "S" },
  { symbol: "sBTC", name: "Stacks BTC", contract: "sbtc", icon: "₿" },
];

function isValidStacksAddress(addr: string): boolean {
  if (!addr) return false;
  return /^S[PT][A-Z0-9]{20,}$/i.test(addr);
}

export const ContinuousStreamForm: React.FC<ContinuousStreamFormProps> = ({ onSubmit }) => {
  const [recipient, setRecipient] = useState("");
  const [selectedToken, setSelectedToken] = useState(TOKEN_OPTIONS[0]);
  const [amount, setAmount] = useState("");
  const [durationPreset, setDurationPreset] = useState("30d");
  const [customDuration, setCustomDuration] = useState("");
  const [touched, setTouched] = useState({ recipient: false, amount: false });

  const recipientValid = isValidStacksAddress(recipient);

  const durationBlocks = useMemo(() => {
    if (durationPreset === "custom") {
      const days = parseInt(customDuration, 10);
      return isNaN(days) || days <= 0 ? 0 : days * BLOCKS_PER_DAY;
    }
    return DURATION_PRESETS.find((p) => p.label === durationPreset)?.blocks ?? 0;
  }, [durationPreset, customDuration]);

  const amountMicro = useMemo(() => {
    try {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) return 0n;
      return BigInt(Math.floor(parsed * 1_000_000));
    } catch {
      return 0n;
    }
  }, [amount]);

  const ratePerBlock = useMemo(() => {
    if (durationBlocks === 0 || amountMicro === 0n) return 0n;
    return amountMicro / BigInt(durationBlocks);
  }, [amountMicro, durationBlocks]);

  const protocolFee = useMemo(() => {
    return (amountMicro * BigInt(PROTOCOL_FEE_BPS)) / 10000n;
  }, [amountMicro]);

  const totalCost = amountMicro + protocolFee;

  const endDate = useMemo(() => {
    if (durationBlocks <= 0) return null;
    const minutes = durationBlocks * 10; // ~10 min per block
    const end = new Date(Date.now() + minutes * 60 * 1000);
    return end.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [durationBlocks]);

  const canSubmit =
    recipientValid &&
    amountMicro >= MIN_AMOUNT &&
    durationBlocks > 0 &&
    ratePerBlock > 0n;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      recipient,
      tokenContract: selectedToken.contract,
      amount,
      durationPreset,
      customDuration,
      ratePerBlock,
      protocolFee,
      totalCost,
    });
  };

  return (
    <div className="space-y-6">
      {/* Recipient */}
      <div>
        <label htmlFor="recipient" className="block text-sm font-semibold text-white mb-2">
          Recipient Address
        </label>
        <div className="relative">
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, recipient: true }))}
            placeholder="SP... or ST..."
            className="w-full bg-dark-bg border border-border rounded-lg px-4 py-3 text-white placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-orange/50 focus:border-orange/50 transition-all font-mono text-sm"
          />
          {touched.recipient && recipient && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {recipientValid ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          )}
        </div>
        {touched.recipient && recipient && !recipientValid && (
          <p className="text-xs text-red-400 mt-1.5">Enter a valid Stacks address (SP... or ST...)</p>
        )}
      </div>

      {/* Token Selector */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">Token</label>
        <div className="flex gap-3">
          {TOKEN_OPTIONS.map((token) => (
            <button
              key={token.symbol}
              onClick={() => setSelectedToken(token)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                selectedToken.symbol === token.symbol
                  ? "border-orange bg-orange/10 text-white ring-2 ring-orange/20"
                  : "border-border bg-card-bg text-text-secondary hover:border-border hover:text-white"
              }`}
            >
              <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                {token.icon}
              </span>
              {token.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-semibold text-white mb-2">
          Amount ({selectedToken.symbol})
        </label>
        <input
          id="amount"
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
          placeholder="0.00"
          className="w-full bg-dark-bg border border-border rounded-lg px-4 py-3 text-white placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-orange/50 focus:border-orange/50 transition-all font-mono text-sm"
        />
        {amount && parseFloat(amount) > 0 && (
          <p className="text-xs text-text-secondary mt-1.5">
            ≈ ${(parseFloat(amount) * 0.45).toFixed(2)} USD estimate
          </p>
        )}
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">Duration</label>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setDurationPreset(preset.label)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                durationPreset === preset.label
                  ? "border-orange bg-orange/10 text-white"
                  : "border-border bg-card-bg text-text-secondary hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setDurationPreset("custom")}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              durationPreset === "custom"
                ? "border-orange bg-orange/10 text-white"
                : "border-border bg-card-bg text-text-secondary hover:text-white"
            }`}
          >
            Custom
          </button>
        </div>
        {durationPreset === "custom" && (
          <input
            type="number"
            min="1"
            value={customDuration}
            onChange={(e) => setCustomDuration(e.target.value)}
            placeholder="Number of days"
            className="mt-3 w-full bg-dark-bg border border-border rounded-lg px-4 py-3 text-white placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-orange/50 focus:border-orange/50 transition-all text-sm"
          />
        )}
        {endDate && (
          <p className="text-xs text-text-secondary mt-2">
            Estimated end date: <span className="text-white font-medium">{endDate}</span> ({durationBlocks.toLocaleString()} blocks)
          </p>
        )}
      </div>

      {/* Derived Values */}
      {amountMicro > 0n && durationBlocks > 0 && (
        <div className="p-4 bg-card-bg border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Rate per block</span>
            <span className="font-mono text-white">
              {(Number(ratePerBlock) / 1_000_000).toFixed(6)} {selectedToken.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Protocol fee (0.25%)</span>
            <span className="font-mono text-white">
              {(Number(protocolFee) / 1_000_000).toFixed(6)} {selectedToken.symbol}
            </span>
          </div>
          <div className="border-t border-border pt-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-orange">Total you pay</span>
            <span className="font-mono font-bold text-orange text-base">
              {(Number(totalCost) / 1_000_000).toFixed(6)} {selectedToken.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange to-orange/80 text-white py-3.5 rounded-lg font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-orange/15"
      >
        Review Stream
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
