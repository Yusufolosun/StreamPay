"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Zap, Landmark, CalendarClock } from "lucide-react";
import { StreamTypeSelection } from "./StreamTypeSelection";
import { ContinuousStreamForm } from "./ContinuousStreamForm";
import { MilestoneInvoiceForm } from "./MilestoneInvoiceForm";
import { ReviewConfirm } from "./ReviewConfirm";

export type StreamType = "continuous" | "milestone" | "vesting";

export interface ContinuousFormData {
  recipient: string;
  tokenContract: string;
  amount: string;
  durationPreset: string;
  customDuration: string;
  ratePerBlock: bigint;
  protocolFee: bigint;
  totalCost: bigint;
}

export interface MilestoneFormData {
  recipient: string;
  totalAmount: string;
  tokenContract: string;
  arbiter: string;
  milestones: { label: string; percentage: number }[];
}

export default function SendPage() {
  const [step, setStep] = useState(1);
  const [streamType, setStreamType] = useState<StreamType | null>(null);
  const [continuousData, setContinuousData] = useState<ContinuousFormData | null>(null);
  const [milestoneData, setMilestoneData] = useState<MilestoneFormData | null>(null);

  const handleTypeSelect = (type: StreamType) => {
    setStreamType(type);
    setStep(2);
  };

  const handleContinuousSubmit = (data: ContinuousFormData) => {
    setContinuousData(data);
    setStep(3);
  };

  const handleMilestoneSubmit = (data: MilestoneFormData) => {
    setMilestoneData(data);
    setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Step indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0 ${
                  s === step
                    ? "bg-gradient-to-r from-orange to-violet text-white shadow-lg shadow-orange/20"
                    : s < step
                    ? "bg-orange/20 text-orange"
                    : "bg-card-bg border border-border text-text-secondary"
                }`}
              >
                {s}
              </div>
              <span className="text-xs font-semibold text-text-secondary sm:hidden">
                {s === 1 && "Choose Stream Type"}
                {s === 2 && "Configure Parameters"}
                {s === 3 && "Review & Confirm"}
              </span>
            </div>
            {s < 3 && (
              <div
                className={`w-0.5 h-6 sm:w-auto sm:h-0.5 sm:flex-1 ml-4 sm:ml-0 transition-all ${
                  s < step ? "bg-orange/40" : "bg-border"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step title */}
      <div className="mb-8">
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Create a Payment Stream</h1>
            <p className="text-text-secondary">Choose the type of stream you want to create.</p>
          </>
        )}
        {step === 2 && streamType === "continuous" && (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Continuous Stream</h1>
            <p className="text-text-secondary">Configure the recipient, amount, and duration.</p>
          </>
        )}
        {step === 2 && streamType === "milestone" && (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Milestone Invoice</h1>
            <p className="text-text-secondary">Set up milestone-based conditional releases.</p>
          </>
        )}
        {step === 2 && streamType === "vesting" && (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Vesting Schedule</h1>
            <p className="text-text-secondary">Configure a token vesting schedule.</p>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Review &amp; Confirm</h1>
            <p className="text-text-secondary">Verify all parameters before signing the transaction.</p>
          </>
        )}
      </div>

      {/* Back navigation */}
      {step > 1 && (
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {/* Step content */}
      {step === 1 && <StreamTypeSelection onSelect={handleTypeSelect} />}
      {step === 2 && streamType === "continuous" && (
        <ContinuousStreamForm onSubmit={handleContinuousSubmit} />
      )}
      {step === 2 && streamType === "milestone" && (
        <MilestoneInvoiceForm onSubmit={handleMilestoneSubmit} />
      )}
      {step === 2 && streamType === "vesting" && (
        <ContinuousStreamForm onSubmit={handleContinuousSubmit} />
      )}
      {step === 3 && (
        <ReviewConfirm
          streamType={streamType!}
          continuousData={continuousData}
          milestoneData={milestoneData}
        />
      )}
    </div>
  );
}
