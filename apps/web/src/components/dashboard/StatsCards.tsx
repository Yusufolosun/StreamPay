"use client";

import React from "react";
import { Activity, TrendingUp, Banknote, Receipt } from "lucide-react";
import type { StreamView } from "../../lib/api";
import { BLOCKS_PER_DAY } from "../../lib/constants";

interface StatsCardsProps {
  streams: StreamView[];
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
}

function StatCard({ label, value, icon, gradient, subtitle }: StatCardProps) {
  return (
    <div className="relative group overflow-hidden rounded-xl border border-border bg-card-bg p-5 hover:border-orange/30 transition-all duration-300">
      {/* Glow effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {label}
          </span>
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-white">{value}</p>
        {subtitle && (
          <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export const StatsCards: React.FC<StatsCardsProps> = ({ streams }) => {
  const activeStreams = streams.filter(
    (s) => s.status === "active"
  ).length;

  const totalStreaming = streams
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + Number(s.fundedAmount || "0"), 0);

  const totalPaidOut = streams.reduce(
    (sum, s) => sum + Number(s.balance?.withdrawnAmount || "0"),
    0
  );

  // Estimate fees paid: 0.25% of funded amount across all streams
  const feesPaid = streams.reduce(
    (sum, s) => sum + Number(s.fundedAmount || "0") * 0.0025,
    0
  );

  const formatMicro = (micro: number) => {
    const val = micro / 1_000_000;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
    return val.toFixed(2);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Active Streams"
        value={activeStreams.toString()}
        icon={<Activity className="w-4 h-4 text-green-400" />}
        gradient="bg-gradient-to-br from-green-500/5 to-transparent"
        subtitle={`${streams.length} total streams`}
      />
      <StatCard
        label="Total Streaming"
        value={`${formatMicro(totalStreaming)} STX`}
        icon={<TrendingUp className="w-4 h-4 text-orange" />}
        gradient="bg-gradient-to-br from-orange/5 to-transparent"
        subtitle="Across active streams"
      />
      <StatCard
        label="Total Paid Out"
        value={`${formatMicro(totalPaidOut)} STX`}
        icon={<Banknote className="w-4 h-4 text-violet" />}
        gradient="bg-gradient-to-br from-violet/5 to-transparent"
        subtitle="Claimed by recipients"
      />
      <StatCard
        label="Fees Paid"
        value={`${formatMicro(feesPaid)} STX`}
        icon={<Receipt className="w-4 h-4 text-yellow-400" />}
        gradient="bg-gradient-to-br from-yellow-500/5 to-transparent"
        subtitle="0.25% protocol fee"
      />
    </div>
  );
};

export default StatsCards;
