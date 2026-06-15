"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowRight,
  Plus,
  Trash2,
  Info,
  HelpCircle,
} from "lucide-react";
import type { MilestoneFormData } from "./page";
import { AddressInput } from "../../components/AddressInput";

interface MilestoneInvoiceFormProps {
  onSubmit: (data: MilestoneFormData) => void;
}

const MAX_MILESTONES = 10;
const MIN_MILESTONES = 1;

const TOKEN_OPTIONS = [
  { symbol: "STX", name: "Stacks", contract: "", icon: "S" },
  { symbol: "sBTC", name: "Stacks BTC", contract: "sbtc", icon: "₿" },
];

function isValidStacksAddress(addr: string): boolean {
  if (!addr) return false;
  return /^S[PT][A-Z0-9]{20,}$/i.test(addr);
}

export const MilestoneInvoiceForm: React.FC<MilestoneInvoiceFormProps> = ({
  onSubmit,
}) => {
  const [recipient, setRecipient] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(TOKEN_OPTIONS[0]);
  const [arbiter, setArbiter] = useState("");
  const [milestones, setMilestones] = useState<
    { label: string; percentage: number }[]
  >([{ label: "", percentage: 100 }]);
  const [touched, setTouched] = useState({
    recipient: false,
    amount: false,
    arbiter: false,
  });
  const [showArbiterTooltip, setShowArbiterTooltip] = useState(false);

  const recipientValid = isValidStacksAddress(recipient);
  const arbiterValid = arbiter === "" || isValidStacksAddress(arbiter);

  const totalPercentage = useMemo(
    () => milestones.reduce((sum, m) => sum + m.percentage, 0),
    [milestones],
  );

  const percentageExact = totalPercentage === 100;

  const amountValid = useMemo(() => {
    const parsed = parseFloat(totalAmount);
    return !isNaN(parsed) && parsed > 0;
  }, [totalAmount]);

  const allLabelsValid = milestones.every((m) => m.label.trim().length > 0);

  const canSubmit =
    recipientValid &&
    amountValid &&
    percentageExact &&
    allLabelsValid &&
    arbiterValid;

  const addMilestone = () => {
    if (milestones.length >= MAX_MILESTONES) return;
    setMilestones((prev) => [...prev, { label: "", percentage: 0 }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length <= MIN_MILESTONES) return;
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMilestone = (
    index: number,
    field: "label" | "percentage",
    value: string | number,
  ) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      recipient,
      totalAmount,
      tokenContract: selectedToken.contract,
      arbiter,
      milestones,
    });
  };

  const percentageColor = useMemo(() => {
    if (totalPercentage === 100) return "text-green-500";
    if (totalPercentage > 100) return "text-red-500";
    return "text-orange";
  }, [totalPercentage]);

  return (
    <div className="space-y-6">
      {/* Recipient */}
      <div>
        <label
          htmlFor="ms-recipient"
          className="block text-sm font-semibold text-white mb-2"
        >
          Recipient Address
        </label>
        <AddressInput
          id="ms-recipient"
          value={recipient}
          onChange={setRecipient}
          placeholder="SP... or name.btc"
        />
      </div>

      {/* Token + Total Amount row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Token
          </label>
          <div className="flex gap-2">
            {TOKEN_OPTIONS.map((token) => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(token)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  selectedToken.symbol === token.symbol
                    ? "border-orange bg-orange/10 text-white ring-2 ring-orange/20"
                    : "border-border bg-card-bg text-text-secondary hover:text-white"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">
                  {token.icon}
                </span>
                {token.symbol}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            htmlFor="ms-amount"
            className="block text-sm font-semibold text-white mb-2"
          >
            Total Amount
          </label>
          <input
            id="ms-amount"
            type="number"
            min="0"
            step="any"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
            placeholder="0.00"
            className="w-full bg-dark-bg border border-border rounded-lg px-4 py-2.5 text-white placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-orange/50 focus:border-orange/50 transition-all font-mono text-sm"
          />
        </div>
      </div>

      {/* Arbiter (optional) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label
            htmlFor="ms-arbiter"
            className="text-sm font-semibold text-white"
          >
            Arbiter Address
            <span className="text-text-secondary font-normal ml-1">
              (Optional)
            </span>
          </label>
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowArbiterTooltip(true)}
              onMouseLeave={() => setShowArbiterTooltip(false)}
              className="text-text-secondary hover:text-white transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            {showArbiterTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-dark-bg border border-border rounded-lg shadow-xl text-xs text-text-secondary z-10">
                <p className="font-semibold text-white mb-1">
                  What is an arbiter?
                </p>
                <p>
                  An arbiter is a neutral third party who can resolve disputes
                  between sender and recipient. If a milestone is disputed, the
                  arbiter decides whether funds go to the recipient or are
                  returned to the sender.
                </p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-dark-bg border-r border-b border-border rotate-45 -mt-1" />
              </div>
            )}
          </div>
        </div>
        <AddressInput
          id="ms-arbiter"
          value={arbiter}
          onChange={setArbiter}
          placeholder="SP... (must be a registered arbiter or .btc name)"
        />
      </div>

      {/* Milestone Builder */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-white">Milestones</label>
          <div className={`text-sm font-mono font-bold ${percentageColor}`}>
            {totalPercentage}% / 100%
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-dark-bg border border-border rounded-full mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              totalPercentage === 100
                ? "bg-green-500"
                : totalPercentage > 100
                ? "bg-red-500"
                : "bg-gradient-to-r from-orange to-violet"
            }`}
            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
          />
        </div>

        <div className="space-y-3">
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card-bg border border-border rounded-lg group"
            >
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-text-secondary shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary sm:hidden">Milestone #{index + 1}</span>
                </div>
                {/* Remove button for mobile */}
                <button
                  onClick={() => removeMilestone(index)}
                  disabled={milestones.length <= MIN_MILESTONES}
                  className="sm:hidden p-2 text-text-secondary hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors duration-150 active:scale-95 transition-transform"
                  style={{ minHeight: 44, minWidth: 44 }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Label */}
              <input
                type="text"
                value={milestone.label}
                onChange={(e) =>
                  updateMilestone(index, "label", e.target.value)
                }
                placeholder="Milestone description"
                maxLength={64}
                className="w-full sm:flex-1 bg-dark-bg border border-border rounded-lg px-3 py-2 text-white placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-orange/50 transition-all text-sm"
                style={{ minHeight: 44 }}
              />

              {/* Percentage slider + input */}
              <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={milestone.percentage}
                  onChange={(e) =>
                    updateMilestone(
                      index,
                      "percentage",
                      parseInt(e.target.value, 10),
                    )
                  }
                  className="flex-1 sm:w-20 h-1.5 accent-orange bg-border rounded-full cursor-pointer"
                />
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={milestone.percentage}
                    onChange={(e) =>
                      updateMilestone(
                        index,
                        "percentage",
                        Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                      )
                    }
                    className="w-16 bg-dark-bg border border-border rounded-lg px-2 py-1.5 text-white text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-orange/50 transition-all"
                    style={{ minHeight: 44 }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Remove button for desktop */}
              <button
                onClick={() => removeMilestone(index)}
                disabled={milestones.length <= MIN_MILESTONES}
                className="hidden sm:block p-2 text-text-secondary hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors duration-150 active:scale-95 transition-transform shrink-0"
                style={{ minHeight: 44, minWidth: 44 }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add milestone */}
        {milestones.length < MAX_MILESTONES && (
          <button
            onClick={addMilestone}
            className="w-full mt-3 flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg text-sm text-text-secondary hover:text-white hover:border-orange/30 transition-all active:scale-95 duration-100 transition-transform"
            style={{ minHeight: 44 }}
          >
            <Plus className="w-4 h-4" />
            Add Milestone ({milestones.length}/{MAX_MILESTONES})
          </button>
        )}

        {/* Validation messages */}
        {!percentageExact && totalPercentage > 0 && (
          <div className="mt-3 flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-orange" />
            <span className="text-text-secondary">
              {totalPercentage < 100
                ? `Add ${100 - totalPercentage}% more to reach exactly 100%.`
                : `Reduce by ${totalPercentage - 100}% to reach exactly 100%.`}
            </span>
          </div>
        )}
        {!allLabelsValid && milestones.length > 0 && (
          <div className="mt-2 flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-orange" />
            <span className="text-text-secondary">
              Every milestone must have a description.
            </span>
          </div>
        )}
      </div>

      {/* Amount breakdown per milestone */}
      {amountValid && percentageExact && (
        <div className="p-4 bg-card-bg border border-border rounded-xl space-y-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Per-Milestone Breakdown
          </p>
          {milestones.map((m, i) => {
            const amt = (parseFloat(totalAmount) * m.percentage) / 100;
            return (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-secondary truncate max-w-[60%]">
                  {m.label || `Milestone ${i + 1}`}
                </span>
                <span className="font-mono text-white">
                  {amt.toFixed(6)} {selectedToken.symbol}{" "}
                  <span className="text-text-secondary text-xs">
                    ({m.percentage}%)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet to-violet/80 text-white py-3.5 rounded-lg font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 duration-100 transition-transform shadow-lg shadow-violet/15"
        style={{ minHeight: 44 }}
      >
        Review Invoice
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
