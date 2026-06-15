"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, ArrowLeft, ArrowRight, Eye, RefreshCw, Layers, Loader2 } from "lucide-react";
import { useExplorerStreams } from "../../lib/queries/streams";
import { truncateAddress, formatSTX } from "../../lib/validation";
import { useBnsName } from "../../hooks/useBnsName";
import { ProtocolStats } from "../../components/explorer/ProtocolStats";

export default function ExplorerPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tokenFilter, setTokenFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Search debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page to 1 when search term changes
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  // Query streams with filters
  const { data, isLoading, isPlaceholderData, refetch } = useExplorerStreams({
    address: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit,
  });

  const streams = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  // Token filtration client-side (since api filters primarily by status/address)
  const filteredStreams = useMemo(() => {
    if (tokenFilter === "all") return streams;
    return streams.filter((s) => {
      const isSbtc = s.tokenContract?.toLowerCase().includes("sbtc");
      if (tokenFilter === "sbtc") return isSbtc;
      return !isSbtc; // stx
    });
  }, [streams, tokenFilter]);

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-green-500/10 text-green-400 border-green-500/20" },
    paused: { label: "Paused", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    completed: { label: "Expired", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Public Stream Explorer</h1>
          <p className="text-text-secondary text-sm mt-1">
            Search, filter, and view real-time Stacks payment streams and smart contract events.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 self-start px-4 py-2 text-sm font-medium border border-border bg-card-bg hover:bg-opacity-80 hover:text-white rounded-lg transition-colors text-text-secondary"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Protocol Stats Banner */}
      <ProtocolStats />

      {/* Filters & Search Controls */}
      <div className="rounded-2xl border border-border bg-card-bg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Stacks Address (Sender or Recipient)..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-dark-bg text-white placeholder-text-secondary focus:border-orange/40 focus:ring-1 focus:ring-orange/30 outline-none text-sm transition-all font-mono"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            {/* Status Filter */}
            <div className="w-full sm:w-44">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-dark-bg text-white focus:border-orange/40 outline-none text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Expired</option>
              </select>
            </div>

            {/* Token Filter */}
            <div className="w-full sm:w-44">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                Token
              </label>
              <select
                value={tokenFilter}
                onChange={(e) => setTokenFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-dark-bg text-white focus:border-orange/40 outline-none text-sm"
              >
                <option value="all">All Tokens</option>
                <option value="stx">STX</option>
                <option value="sbtc">sBTC</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Streams Table */}
      <div className="rounded-2xl border border-border bg-card-bg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-text-secondary">
            <thead className="bg-white/2 text-white border-b border-border text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4 font-semibold">Stream ID</th>
                <th className="px-6 py-4 font-semibold">Sender</th>
                <th className="px-6 py-4 font-semibold">Recipient</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Token</th>
                <th className="px-6 py-4 font-semibold">Rate per Day</th>
                <th className="px-6 py-4 font-semibold">Total Amount</th>
                <th className="px-6 py-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 justify-center text-text-secondary">
                      <Loader2 className="w-6 h-6 animate-spin text-orange" />
                      <span>Loading streams list...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStreams.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 justify-center text-text-secondary">
                      <Layers className="w-8 h-8 opacity-45" />
                      <span>No matching payment streams found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStreams.map((stream) => {
                  const statusCfg = STATUS_CONFIG[stream.status] || STATUS_CONFIG.completed;
                  const tokenSymbol = stream.tokenContract?.toLowerCase().includes("sbtc") ? "sBTC" : "STX";
                  const ratePerBlock = Number(stream.ratePerBlock || "0");
                  const ratePerDay = ratePerBlock * 144; // BLOCKS_PER_DAY = 144
                  const total = Number(stream.fundedAmount || "0");

                  return (
                    <tr
                      key={stream.id}
                      className="hover:bg-white/2 transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        #{stream.id}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <ParticipantCell address={stream.sender} />
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <ParticipantCell address={stream.recipient} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange/10 text-orange">
                          {tokenSymbol}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-white text-xs">
                        {formatSTX(ratePerDay, 2)}/day
                      </td>
                      <td className="px-6 py-4 font-mono text-white font-semibold">
                        {formatSTX(total, 6)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/explorer/streams/${stream.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:text-orange/80 bg-orange/5 hover:bg-orange/10 px-2.5 py-1.5 rounded-lg border border-orange/10 hover:border-orange/20 transition-all active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-white/2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border bg-dark-bg hover:bg-opacity-80 rounded-lg text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="text-xs text-text-secondary">
              Page <span className="font-semibold text-white">{page}</span> of <span className="font-semibold text-white">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading || isPlaceholderData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border bg-dark-bg hover:bg-opacity-80 rounded-lg text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component to resolve and display BNS name inside cells
function ParticipantCell({ address }: { address: string }) {
  const { data: bnsName } = useBnsName(address);
  return (
    <span title={address}>
      {bnsName || truncateAddress(address)}
    </span>
  );
}
