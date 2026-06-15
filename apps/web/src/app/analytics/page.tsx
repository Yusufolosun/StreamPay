"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchStreams } from "../../lib/api";
import type { StreamView } from "../../lib/api";
import { formatSTX } from "../../lib/validation";
import { AddressDisplay } from "../../components/AddressDisplay";
import {
  TrendingUp,
  Users,
  Activity,
  Layers,
  Download,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Loader2,
  PieChart as PieIcon,
  BarChart2 as BarIcon,
  LineChart as LineIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// Premium Dark Mode Color Palette
const COLORS = {
  orange: "#f97316",
  violet: "#8b5cf6",
  green: "#22c55e",
  red: "#ef4444",
  gray: "#9ca3af",
  chartColors: ["#f97316", "#8b5cf6", "#3b82f6", "#10b981", "#ec4899"],
};

export default function AnalyticsPage() {
  const { address, isConnected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "sent" | "received">("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all streams for public protocol stats
  const { data: allStreamsRes, isLoading: loadingAll } = useQuery({
    queryKey: ["all-streams-analytics"],
    queryFn: () => fetchStreams({ limit: 100 }),
    refetchInterval: 30000,
  });

  // Fetch personal streams for wallet stats
  const { data: personalStreamsRes, isLoading: loadingPersonal } = useQuery({
    queryKey: ["personal-streams-analytics", address],
    queryFn: () => {
      if (!address) return { data: [] as StreamView[] };
      return fetchStreams({ address, limit: 100 });
    },
    enabled: !!address,
    refetchInterval: 30000,
  });

  const allStreams = allStreamsRes?.data || [];
  const personalStreams = personalStreamsRes?.data || [];

  // 1. PUBLIC PROTOCOL STATS CALCULATIONS
  const protocolStats = useMemo(() => {
    if (allStreams.length === 0) {
      return {
        totalStreams: 0,
        totalStreamsDelta: 0,
        activeStreams: 0,
        activeStreamsDelta: 0,
        totalVolume: 0,
        totalVolumeDelta: 0,
        uniqueParticipants: 0,
        uniqueParticipantsDelta: 0,
      };
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Filter functions
    const createdIn24h = (s: StreamView) => (s.createdAt || 0) * 1000 > oneDayAgo;

    // Total streams & delta
    const totalStreams = allStreams.length;
    const totalStreamsDelta = allStreams.filter(createdIn24h).length;

    // Active streams & delta
    const activeStreams = allStreams.filter((s) => s.status === "active").length;
    const activeStreamsDelta = allStreams.filter((s) => s.status === "active" && createdIn24h(s)).length;

    // Total volume & delta (STX volume primarily, sBTC converted or summed)
    const getVolume = (s: StreamView) => Number(s.fundedAmount || "0") / 1_000_000;
    const totalVolume = allStreams.reduce((sum, s) => sum + getVolume(s), 0);
    const totalVolumeDelta = allStreams.filter(createdIn24h).reduce((sum, s) => sum + getVolume(s), 0);

    // Unique participants & delta
    const getParticipants = (list: StreamView[]) => {
      const set = new Set<string>();
      list.forEach((s) => {
        if (s.sender) set.add(s.sender);
        if (s.recipient) set.add(s.recipient);
      });
      return set.size;
    };
    const uniqueParticipants = getParticipants(allStreams);

    const streams24h = allStreams.filter(createdIn24h);
    const uniqueParticipantsDelta = getParticipants(streams24h);

    return {
      totalStreams,
      totalStreamsDelta,
      activeStreams,
      activeStreamsDelta,
      totalVolume,
      totalVolumeDelta,
      uniqueParticipants,
      uniqueParticipantsDelta,
    };
  }, [allStreams]);

  // 2. LINE CHART: STREAMS & VOLUME LAST 30 DAYS
  const lineChartData = useMemo(() => {
    const dataMap: Record<string, { date: string; count: number; volume: number }> = {};
    const now = new Date();

    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dataMap[dateStr] = { date: dateStr, count: 0, volume: 0 };
    }

    allStreams.forEach((s) => {
      if (!s.createdAt) return;
      const date = new Date(s.createdAt * 1000);
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dataMap[dateStr]) {
        dataMap[dateStr].count += 1;
        dataMap[dateStr].volume += Number(s.fundedAmount || "0") / 1_000_000;
      }
    });

    return Object.values(dataMap);
  }, [allStreams]);

  // 3. DONUT CHART: STX vs sBTC Breakdown
  const donutChartData = useMemo(() => {
    let stxVol = 0;
    let sbtcVol = 0;

    allStreams.forEach((s) => {
      const isSbtc = s.tokenContract?.toLowerCase().includes("sbtc");
      const vol = Number(s.fundedAmount || "0");
      if (isSbtc) {
        sbtcVol += vol / 100_000_000; // 8 decimals
      } else {
        stxVol += vol / 1_000_000; // 6 decimals
      }
    });

    return [
      { name: "STX Volume", value: stxVol },
      { name: "sBTC Volume", value: sbtcVol * 100000 }, // Scaled or as raw values. Let's do raw values for legend, but represent breakdown
    ].filter((item) => item.value > 0);
  }, [allStreams]);

  // 4. HISTOGRAM: Stream duration distribution
  const durationData = useMemo(() => {
    let d7 = 0;
    let d14 = 0;
    let d30 = 0;
    let d90 = 0;
    let custom = 0;

    allStreams.forEach((s) => {
      // blocks elapsed or total duration blocks
      const start = Number(s.startBlock || 0);
      const rate = Number(s.ratePerBlock || 0);
      const funded = Number(s.fundedAmount || 0);
      const durationBlocks = rate > 0 ? funded / rate : 0;
      const days = durationBlocks / 144; // 144 blocks per day

      if (days <= 7) d7++;
      else if (days <= 14) d14++;
      else if (days <= 30) d30++;
      else if (days <= 90) d90++;
      else custom++;
    });

    return [
      { name: "≤ 7 Days", count: d7 },
      { name: "8 - 14 Days", count: d14 },
      { name: "15 - 30 Days", count: d30 },
      { name: "31 - 90 Days", count: d90 },
      { name: "> 90 Days", count: custom },
    ];
  }, [allStreams]);

  // 5. PERSONAL STATS CALCULATIONS
  const personalStats = useMemo(() => {
    if (!address || personalStreams.length === 0) {
      return {
        totalSent: 0,
        totalReceived: 0,
        active: 0,
        completed: 0,
        feesPaid: 0,
      };
    }

    let totalSent = 0;
    let totalReceived = 0;
    let active = 0;
    let completed = 0;
    let feesPaid = 0;

    personalStreams.forEach((s) => {
      const isSender = s.sender === address;
      const isRecipient = s.recipient === address;
      const amount = Number(s.fundedAmount || "0") / 1_000_000;

      if (isSender) {
        totalSent += amount;
        feesPaid += amount * 0.0025; // 0.25% fee
      }
      if (isRecipient) {
        totalReceived += amount;
      }
      if (s.status === "active") {
        active++;
      } else if (s.status === "completed") {
        completed++;
      }
    });

    return {
      totalSent,
      totalReceived,
      active,
      completed,
      feesPaid,
    };
  }, [personalStreams, address]);

  // 6. TIMELINE HISTORY FILTER
  const filteredTimeline = useMemo(() => {
    if (timelineFilter === "all") return personalStreams;
    return personalStreams.filter((s) => {
      if (timelineFilter === "sent") return s.sender === address;
      return s.recipient === address;
    });
  }, [personalStreams, timelineFilter, address]);

  // CSV EXPORT BUTTON
  const exportToCSV = () => {
    if (personalStreams.length === 0) return;

    const headers = [
      "Stream ID",
      "Type",
      "Counterparty",
      "Token",
      "Amount",
      "Rate",
      "Start",
      "End",
      "Status",
      "Claimed",
    ];

    const rows = personalStreams.map((s) => {
      const isSender = s.sender === address;
      const counterparty = isSender ? s.recipient : s.sender;
      const token = s.tokenContract?.toLowerCase().includes("sbtc") ? "sBTC" : "STX";
      const amount = formatSTX(Number(s.fundedAmount || 0));
      const rate = formatSTX(Number(s.ratePerBlock || 0));
      const start = s.startBlock;
      const rateNum = Number(s.ratePerBlock || 0);
      const duration = rateNum > 0 ? Number(s.fundedAmount || 0) / rateNum : 0;
      const end = s.startBlock + Math.floor(duration);
      const status = s.status;
      const claimed = formatSTX(Number(s.balance?.withdrawnAmount || 0));

      return [
        s.id,
        "continuous",
        counterparty,
        token,
        amount,
        rate,
        start,
        end,
        status,
        claimed,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `streampay_export_${address?.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Analytics Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          Real-time metrics, system stats, and personal cash flows.
        </p>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 1: PUBLIC PROTOCOL METRICS */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange animate-pulse" />
          Protocol Overview
        </h2>

        {/* 4 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loadingAll ? (
            Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="animate-pulse border border-border bg-card-bg rounded-xl p-5 h-28" />
              ))
          ) : allStreams.length === 0 ? (
            <div className="col-span-4 py-8 text-center bg-card-bg border border-border rounded-xl text-text-secondary">
              No protocol streams indexed yet.
            </div>
          ) : (
            <>
              {/* Total Streams */}
              <div className="border border-border bg-card-bg rounded-xl p-5">
                <p className="text-xs text-text-secondary uppercase font-semibold">Total Streams</p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-bold text-white">{protocolStats.totalStreams}</p>
                  <span className="text-xs font-semibold text-green-400 flex items-center">
                    +{protocolStats.totalStreamsDelta} (24h)
                  </span>
                </div>
              </div>

              {/* Active Streams */}
              <div className="border border-border bg-card-bg rounded-xl p-5">
                <p className="text-xs text-text-secondary uppercase font-semibold">Active Streams</p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-bold text-white">{protocolStats.activeStreams}</p>
                  <span className="text-xs font-semibold text-green-400 flex items-center">
                    +{protocolStats.activeStreamsDelta} (24h)
                  </span>
                </div>
              </div>

              {/* Total Volume */}
              <div className="border border-border bg-card-bg rounded-xl p-5">
                <p className="text-xs text-text-secondary uppercase font-semibold">Total Volume</p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-bold text-white">{protocolStats.totalVolume.toFixed(2)} STX</p>
                  <span className="text-xs font-semibold text-green-400 flex items-center">
                    +{protocolStats.totalVolumeDelta.toFixed(2)} (24h)
                  </span>
                </div>
              </div>

              {/* Unique Participants */}
              <div className="border border-border bg-card-bg rounded-xl p-5">
                <p className="text-xs text-text-secondary uppercase font-semibold">Unique Participants</p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-bold text-white">{protocolStats.uniqueParticipants}</p>
                  <span className="text-xs font-semibold text-green-400 flex items-center">
                    +{protocolStats.uniqueParticipantsDelta} (24h)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line Chart */}
          <div className="lg:col-span-2 border border-border bg-card-bg rounded-xl p-5 flex flex-col h-[350px]">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <LineIcon className="w-4 h-4 text-orange" />
              Streams and Volume Over Last 30 Days
            </h3>
            <div className="flex-1 w-full text-xs">
              {loadingAll ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-orange" />
                </div>
              ) : allStreams.length === 0 ? (
                <div className="h-full flex items-center justify-center text-text-secondary">No data available yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis yAxisId="left" stroke="#ff7300" label={{ value: 'Streams Count', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#8884d8" label={{ value: 'Daily Volume (STX)', angle: 90, position: 'insideRight' }} />
                    <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#333" }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="count" name="Streams" stroke="#ff7300" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" dataKey="volume" name="Volume" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Donut Chart */}
          <div className="border border-border bg-card-bg rounded-xl p-5 flex flex-col h-[350px]">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-violet" />
              STX vs sBTC Volume Breakdown
            </h3>
            <div className="flex-1 w-full text-xs relative">
              {loadingAll ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-orange" />
                </div>
              ) : donutChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-text-secondary">No token data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {donutChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.chartColors[index % COLORS.chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#333" }} formatter={(value) => `${Number(value).toFixed(2)} tokens`} />
                    <Legend verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Histogram Chart */}
        <div className="border border-border bg-card-bg rounded-xl p-5 h-[320px] flex flex-col">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarIcon className="w-4 h-4 text-green-400" />
            Stream Duration Distribution
          </h3>
          <div className="flex-1 w-full text-xs">
            {loadingAll ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange" />
              </div>
            ) : allStreams.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#333" }} />
                  <Bar dataKey="count" name="Number of Streams" fill="#22c55e" radius={[4, 4, 0, 0]}>
                    {durationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.chartColors[3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 2: PERSONAL STATS */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="space-y-6 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-violet" />
            Personal Statistics
          </h2>

          {isConnected && address && (
            <button
              onClick={exportToCSV}
              disabled={personalStreams.length === 0}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange to-orange/80 text-white px-4 py-2 rounded-lg font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow shadow-orange/20"
              style={{ minHeight: 40 }}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

        {!isConnected ? (
          <div className="border border-dashed border-border rounded-2xl p-10 text-center bg-card-bg">
            <Wallet className="w-10 h-10 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Connect Wallet</h3>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">
              Please connect your Stacks wallet to view your personal cash flows, timeline, and export transaction data.
            </p>
          </div>
        ) : (
          <>
            {/* Personal Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {loadingPersonal ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="animate-pulse border border-border bg-card-bg rounded-xl p-4 h-24" />
                  ))
              ) : (
                <>
                  {/* Total Sent */}
                  <div className="border border-border bg-card-bg rounded-xl p-4">
                    <p className="text-[10px] text-text-secondary uppercase font-semibold">Total Sent</p>
                    <p className="text-lg font-bold text-white mt-1">{personalStats.totalSent.toFixed(2)} STX</p>
                  </div>

                  {/* Total Received */}
                  <div className="border border-border bg-card-bg rounded-xl p-4">
                    <p className="text-[10px] text-text-secondary uppercase font-semibold">Total Received</p>
                    <p className="text-lg font-bold text-white mt-1">{personalStats.totalReceived.toFixed(2)} STX</p>
                  </div>

                  {/* Active */}
                  <div className="border border-border bg-card-bg rounded-xl p-4">
                    <p className="text-[10px] text-text-secondary uppercase font-semibold">Active</p>
                    <p className="text-lg font-bold text-white mt-1">{personalStats.active}</p>
                  </div>

                  {/* Completed */}
                  <div className="border border-border bg-card-bg rounded-xl p-4">
                    <p className="text-[10px] text-text-secondary uppercase font-semibold">Completed</p>
                    <p className="text-lg font-bold text-white mt-1">{personalStats.completed}</p>
                  </div>

                  {/* Fees Paid */}
                  <div className="border border-border bg-card-bg rounded-xl p-4 col-span-2 md:col-span-1">
                    <p className="text-[10px] text-text-secondary uppercase font-semibold">Fees Paid (0.25%)</p>
                    <p className="text-lg font-bold text-white mt-1">{personalStats.feesPaid.toFixed(4)} STX</p>
                  </div>
                </>
              )}
            </div>

            {/* Payment History Timeline */}
            <div className="border border-border bg-card-bg rounded-2xl p-5 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-bold text-white text-sm">Payment History Timeline</h3>

                {/* Sent / Received Filter Tabs */}
                <div className="flex bg-dark-bg p-1 rounded-lg border border-border self-start">
                  {(["all", "sent", "received"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setTimelineFilter(tab)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                        timelineFilter === tab
                          ? "bg-orange text-white"
                          : "text-text-secondary hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {loadingPersonal ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-orange" />
                </div>
              ) : filteredTimeline.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-xl text-text-secondary text-sm">
                  No payment streams found for this filter.
                </div>
              ) : (
                <div className="relative pl-6 border-l border-border/60 space-y-8">
                  {filteredTimeline.map((s) => {
                    const isSender = s.sender === address;
                    const date = s.createdAt ? new Date(s.createdAt * 1000).toLocaleDateString() : "N/A";
                    const amt = formatSTX(Number(s.fundedAmount || 0));
                    const tokenSymbol = s.tokenContract?.toLowerCase().includes("sbtc") ? "sBTC" : "STX";

                    return (
                      <div key={s.id} className="relative group/timeline">
                        {/* Circle marker */}
                        <span
                          className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border border-dark-bg flex items-center justify-center ${
                            isSender ? "bg-orange text-white" : "bg-violet text-white"
                          }`}
                        >
                          {isSender ? (
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          ) : (
                            <ArrowDownLeft className="w-2.5 h-2.5" />
                          )}
                        </span>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-sm">Stream #{s.id}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  s.status === "active"
                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                    : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                }`}
                              >
                                {s.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary mt-1">
                              <span>{isSender ? "To:" : "From:"}</span>
                              <AddressDisplay address={isSender ? s.recipient : s.sender} />
                            </div>
                          </div>

                          <div className="sm:text-right">
                            <p className="font-mono font-bold text-white text-sm">
                              {isSender ? "-" : "+"}
                              {amt} {tokenSymbol}
                            </p>
                            <span className="text-[10px] text-text-secondary flex items-center gap-1 mt-0.5 sm:justify-end">
                              <Calendar className="w-3 h-3" />
                              {date}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
