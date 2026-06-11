"use client";

import React from "react";
import { Check, AlertTriangle, ShieldAlert, Lock, Clock } from "lucide-react";
import type { Milestone } from "../../lib/api";

interface MilestoneStepperProps {
  milestones: Milestone[];
  disputeStatuses: boolean[];
}

export function MilestoneStepper({ milestones, disputeStatuses }: MilestoneStepperProps) {
  // Find current active (first unreleased) milestone index
  const activeIndex = milestones.findIndex((m) => !m.isReleased);

  return (
    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 py-4">
      {/* Background connector line for desktop */}
      <div className="hidden md:block absolute left-4 right-4 top-[25px] h-0.5 bg-white/10 -z-10" />

      {milestones.map((m, index) => {
        const isReleased = m.isReleased;
        const isDisputed = disputeStatuses?.[index] === true;
        const isPending = !isReleased && !isDisputed && index === activeIndex;
        const isLocked = !isReleased && !isDisputed && index > activeIndex;

        let statusText = "Pending";
        let colorClasses = "bg-dark-bg border-border text-text-secondary";
        let lineCol = "bg-white/10";
        let Icon = Clock;

        if (isReleased) {
          statusText = "Released";
          colorClasses = "bg-green-500/20 border-green-500 text-green-400 shadow-lg shadow-green-500/10";
          lineCol = "bg-green-500/50";
          Icon = Check;
        } else if (isDisputed) {
          statusText = "Disputed";
          colorClasses = "bg-red-500/20 border-red-500 text-red-400 shadow-lg shadow-red-500/10 animate-pulse";
          Icon = ShieldAlert;
        } else if (isPending) {
          statusText = "Active";
          colorClasses = "bg-orange/20 border-orange text-orange shadow-lg shadow-orange/15";
          Icon = Clock;
        } else if (isLocked) {
          statusText = "Locked";
          colorClasses = "bg-white/2 border-white/5 text-text-secondary/60";
          Icon = Lock;
        }

        return (
          <div key={index} className="flex-1 flex flex-row md:flex-col items-center gap-3.5 w-full z-10">
            {/* Step Icon Container */}
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 ${colorClasses}`}>
              <Icon className="w-5 h-5" />
            </div>

            {/* Label */}
            <div className="text-left md:text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                Milestone {index + 1}
              </span>
              <p className="text-xs font-semibold text-white mt-0.5">
                {m.label}
              </p>
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded ${isReleased ? "bg-green-500/10 text-green-400" : isDisputed ? "bg-red-500/10 text-red-400" : isPending ? "bg-orange/10 text-orange" : "bg-white/5 text-text-secondary"}`}>
                {statusText} ({(m.basisPoints / 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MilestoneStepper;
