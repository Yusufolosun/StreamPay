"use client";

import React from "react";
import { Send, Loader2, Inbox } from "lucide-react";
import Link from "next/link";
import { useWallet } from "../../hooks/useWallet";
import { useSenderStreams } from "../../lib/queries/streams";
import { StatsCards } from "../../components/dashboard/StatsCards";
import { StreamCard } from "../../components/dashboard/StreamCard";
import type { StreamView } from "../../lib/api";

export default function DashboardPage() {
  const { address, isConnected } = useWallet();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSenderStreams(address);

  const streams: StreamView[] = data?.data || [];

  if (!isConnected) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-orange/10 flex items-center justify-center mx-auto mb-6">
          <Send className="w-7 h-7 text-orange" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Sender Dashboard</h1>
        <p className="text-text-secondary mb-6 max-w-md mx-auto">
          Connect your wallet to view and manage your outgoing payment streams.
        </p>
        <p className="text-sm text-orange">
          Click <strong>Connect Wallet</strong> in the navigation bar to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Sender Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your outgoing payment streams
          </p>
        </div>
        <Link
          href="/send"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-orange to-orange/80 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-orange/20"
        >
          <Send className="w-4 h-4" />
          New Stream
        </Link>
      </div>

      {/* Stats cards */}
      <div className="mb-8">
        <StatsCards streams={streams} />
      </div>

      {/* Stream list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-orange" />
          <span className="ml-3 text-text-secondary">Loading streams...</span>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-2">Failed to load streams</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-orange hover:underline"
          >
            Try again
          </button>
        </div>
      ) : streams.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <Inbox className="w-10 h-10 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Streams Yet</h3>
          <p className="text-sm text-text-secondary mb-4">
            You haven't created any payment streams yet.
          </p>
          <Link
            href="/send"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange hover:underline"
          >
            <Send className="w-4 h-4" />
            Create your first stream
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
            Your Streams ({streams.length})
          </h2>
          {streams.map((stream) => (
            <StreamCard
              key={stream.id}
              stream={stream}
              onActionSuccess={() => refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
