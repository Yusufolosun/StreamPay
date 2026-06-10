"use client";

import React from "react";
import { Zap, Landmark, CalendarClock } from "lucide-react";
import type { StreamType } from "./page";

interface StreamTypeSelectionProps {
  onSelect: (type: StreamType) => void;
}

const streamTypes = [
  {
    type: "continuous" as StreamType,
    name: "Continuous Stream",
    icon: Zap,
    description: "Release tokens continuously every block over a set duration.",
    useCase: "Payroll, subscriptions, real-time payments",
    gradient: "from-orange to-orange/60",
    borderHover: "hover:border-orange/50",
    iconBg: "bg-orange/10",
    iconColor: "text-orange",
  },
  {
    type: "milestone" as StreamType,
    name: "Milestone Invoice",
    icon: Landmark,
    description: "Release funds in stages tied to specific deliverables.",
    useCase: "Freelance contracts, project-based work",
    gradient: "from-violet to-violet/60",
    borderHover: "hover:border-violet/50",
    iconBg: "bg-violet/10",
    iconColor: "text-violet",
  },
  {
    type: "vesting" as StreamType,
    name: "Vesting Schedule",
    icon: CalendarClock,
    description: "Lock tokens with a cliff period and gradual release schedule.",
    useCase: "Team token vesting, investor lockups",
    gradient: "from-green-500 to-emerald-500/60",
    borderHover: "hover:border-green-500/50",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
  },
];

export const StreamTypeSelection: React.FC<StreamTypeSelectionProps> = ({ onSelect }) => {
  return (
    <div className="grid gap-4">
      {streamTypes.map((st) => {
        const Icon = st.icon;
        return (
          <button
            key={st.type}
            onClick={() => onSelect(st.type)}
            className={`group relative w-full text-left p-6 bg-card-bg border border-border ${st.borderHover} rounded-xl transition-all hover:shadow-lg active:scale-[0.99]`}
          >
            {/* Orange ring on focus */}
            <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-focus-visible:ring-orange pointer-events-none" />

            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl ${st.iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
              >
                <Icon className={`w-6 h-6 ${st.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:${st.gradient} transition-all">
                  {st.name}
                </h3>
                <p className="text-sm text-text-secondary mb-2">{st.description}</p>
                <span className="inline-block text-xs font-medium px-2.5 py-1 bg-white/5 border border-border rounded-full text-text-secondary">
                  {st.useCase}
                </span>
              </div>
              <div className="shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${st.gradient} flex items-center justify-center`}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
