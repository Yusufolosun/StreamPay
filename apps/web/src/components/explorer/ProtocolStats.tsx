"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, TrendingUp, Activity, Layers, Play, Pause, Loader2 } from "lucide-react";
import { fetchProtocolStats } from "../../lib/api";
import { formatSTX } from "../../lib/validation";

export function ProtocolStats() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["protocolStats"],
    queryFn: fetchProtocolStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl border border-border bg-card-bg/60">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 py-3">
            <div className="w-10 h-10 rounded-xl bg-white/5" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-white/5 rounded w-1/2" />
              <div className="h-5 bg-white/5 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm flex items-center gap-2">
        <span>Failed to load protocol stats. Please verify that the indexer is active.</span>
      </div>
    );
  }

  const volumeVal = Number(stats.totalVolume || "0");

  const statItems = [
    {
      label: "Total Volume",
      value: `${formatSTX(volumeVal, 2)} STX`,
      icon: TrendingUp,
      iconColor: "text-orange",
      bgColor: "from-orange/10 to-orange/5",
    },
    {
      label: "Active Streams",
      value: stats.activeStreams,
      icon: Activity,
      iconColor: "text-green-400",
      bgColor: "from-green-500/10 to-green-500/5",
    },
    {
      label: "Total Streams",
      value: stats.totalStreams,
      icon: Layers,
      iconColor: "text-violet",
      bgColor: "from-violet/10 to-violet/5",
    },
    {
      label: "Current Block Height",
      value: stats.blockHeight > 0 ? stats.blockHeight : "Pending",
      icon: Database,
      iconColor: "text-cyan-400",
      bgColor: "from-cyan-500/10 to-cyan-500/5",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className={`relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${item.bgColor} p-4 flex items-center gap-4 hover:border-white/10 transition-all duration-300`}
            >
              <div className={`p-2.5 rounded-lg bg-white/5 border border-white/5 ${item.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  {item.label}
                </p>
                <p className="text-lg font-bold text-white mt-0.5 tracking-tight font-mono">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Protocol Guard Status Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/2 text-xs">
        <span className="text-text-secondary flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${stats.isProtocolPaused ? "bg-red-500 animate-pulse" : "bg-green-500 animate-pulse"}`} />
          Protocol Mode: <span className="font-semibold text-white">{stats.isProtocolPaused ? "Emergency Paused" : "Operational"}</span>
        </span>
        <span className="text-text-secondary/70">Refreshed every 30s</span>
      </div>
    </div>
  );
}

export default ProtocolStats;
