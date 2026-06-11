"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Inbox,
  Send,
  Shield,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  FileText,
  Landmark,
} from "lucide-react";
import { useWallet } from "../../hooks/useWallet";
import { fetchMilestoneStreams, type MilestoneStream } from "../../lib/api";
import { truncateAddress, formatSTX, formatDate } from "../../lib/validation";
import { useBnsName } from "../../hooks/useBnsName";

export default function MilestonesPage() {
  const { address, isConnected, connect } = useWallet();
  const [activeTab, setActiveTab] = useState<"client" | "freelancer" | "arbiter">("client");

  // Fetch Sent Milestones (as Client)
  const { data: sentStreams, isLoading: isSentLoading } = useQuery({
    queryKey: ["sentMilestones", address],
    queryFn: () => fetchMilestoneStreams({ sender: address || "" }).then((res) => res.data || []),
    enabled: !!address,
    refetchInterval: 30000,
  });

  // Fetch Received Milestones (as Freelancer)
  const { data: receivedStreams, isLoading: isReceivedLoading } = useQuery({
    queryKey: ["receivedMilestones", address],
    queryFn: () => fetchMilestoneStreams({ recipient: address || "" }).then((res) => res.data || []),
    enabled: !!address,
    refetchInterval: 30000,
  });

  // Fetch Arbitrated Milestones (as Arbiter)
  const { data: arbiterStreams, isLoading: isArbiterLoading } = useQuery({
    queryKey: ["arbiterMilestones", address],
    queryFn: () => fetchMilestoneStreams({ arbiter: address || "" }).then((res) => res.data || []),
    enabled: !!address,
    refetchInterval: 30000,
  });

  if (!isConnected || !address) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange/20 to-violet/20 flex items-center justify-center text-violet mx-auto mb-6 border border-violet/15 shadow-xl shadow-violet/5">
          <Landmark className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Connected Wallet Required</h2>
        <p className="text-text-secondary text-sm mb-6 max-w-xs mx-auto">
          Please connect your Stacks wallet to monitor your milestone invoice payments, release payments, or arbitrate disputes.
        </p>
        <button
          onClick={() => connect("leather")}
          className="w-full bg-gradient-to-r from-orange to-violet text-white py-3 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-violet/15"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const getActiveData = () => {
    switch (activeTab) {
      case "freelancer":
        return { list: receivedStreams || [], loading: isReceivedLoading };
      case "arbiter":
        return { list: arbiterStreams || [], loading: isArbiterLoading };
      default:
        return { list: sentStreams || [], loading: isSentLoading };
    }
  };

  const { list, loading } = getActiveData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
          Milestone Payments
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Review milestone-conditioned invoice contracts, release payments to freelancers, or resolve disputes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("client")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === "client"
              ? "border-orange text-white"
              : "border-transparent text-text-secondary hover:text-white"
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-orange" />
          Client (Sent)
          {sentStreams && sentStreams.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white/10 text-xs text-text-secondary font-medium">
              {sentStreams.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("freelancer")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === "freelancer"
              ? "border-orange text-white"
              : "border-transparent text-text-secondary hover:text-white"
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-green-400" />
          Freelancer (Received)
          {receivedStreams && receivedStreams.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white/10 text-xs text-text-secondary font-medium">
              {receivedStreams.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("arbiter")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === "arbiter"
              ? "border-orange text-white"
              : "border-transparent text-text-secondary hover:text-white"
          }`}
        >
          <Shield className="w-4 h-4 text-violet" />
          Arbiter (Designated)
          {arbiterStreams && arbiterStreams.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white/10 text-xs text-text-secondary font-medium">
              {arbiterStreams.length}
            </span>
          )}
        </button>
      </div>

      {/* Grid List */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-orange mb-3" />
            <p className="text-sm">Syncing milestone contracts...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-border bg-card-bg p-12 text-center max-w-lg mx-auto">
            <Landmark className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">No Milestone Contracts</h3>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">
              You are not a participant in any milestone contracts in this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((stream) => (
              <MilestoneContractCard key={stream.id} stream={stream} role={activeTab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface MilestoneContractCardProps {
  stream: MilestoneStream;
  role: "client" | "freelancer" | "arbiter";
}

function MilestoneContractCardInner({ stream, role }: MilestoneContractCardProps) {
  const tokenSymbol = stream.tokenContract?.toLowerCase().includes("sbtc") ? "sBTC" : "STX";
  const partnerAddress = role === "client" ? stream.recipient : stream.sender;
  const { data: partnerBns } = useBnsName(partnerAddress);

  // Calculate stats
  const totalMilestones = stream.milestones.length;
  const releasedMilestones = stream.milestones.filter((m) => m.isReleased).length;

  return (
    <div className="rounded-xl border border-border bg-card-bg hover:border-violet/20 transition-all duration-300 p-5 flex flex-col justify-between min-h-[220px]">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Milestone Stream #{stream.id}
            </span>
            <h4 className="font-semibold text-white text-sm mt-0.5">
              {role === "client" ? "To: " : "From: "}
              {partnerBns || truncateAddress(partnerAddress)}
            </h4>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${stream.isCancelled ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
            {stream.isCancelled ? "Cancelled" : "Active"}
          </span>
        </div>

        {/* Amount */}
        <div className="my-3">
          <p className="text-[9px] uppercase tracking-wider text-text-secondary">Contract Locked Value</p>
          <p className="font-mono text-xl font-extrabold text-white">
            {formatSTX(Number(stream.totalAmount), 6)} <span className="text-orange text-sm">{tokenSymbol}</span>
          </p>
        </div>

        {/* Milestone Steps Bar */}
        <div className="space-y-1.5 my-3">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Milestones:</span>
            <span className="text-white font-semibold">
              {releasedMilestones} / {totalMilestones} released
            </span>
          </div>
          <div className="flex gap-1">
            {stream.milestones.map((m, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  m.isReleased ? "bg-green-400" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-text-secondary">
        <span>Created: {formatDate(stream.createdAt)}</span>
        <Link
          href={`/milestones/${stream.id}`}
          className="inline-flex items-center gap-1 font-semibold text-orange hover:underline"
        >
          Manage Contract
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

const MilestoneContractCard = React.memo(MilestoneContractCardInner);
