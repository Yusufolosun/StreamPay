"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../hooks/useWallet";
import { useQuery } from "@tanstack/react-query";
import { Wallet, LogOut, ExternalLink, X, Check, AlertCircle } from "lucide-react";

export const WalletConnect: React.FC = () => {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [hasLeather, setHasLeather] = useState(false);
  const [hasXverse, setHasXverse] = useState(false);

  // Check if wallet extensions are installed in the browser client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasLeather(!!(window as any).StacksProvider);
      setHasXverse(!!(window as any).XverseProviders?.StacksProvider);
    }
  }, []);

  // Fetch BNS name (e.g. .btc) if address is connected
  const { data: bnsName } = useQuery({
    queryKey: ["bnsName", address],
    queryFn: async () => {
      if (!address) return null;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_HIRO_API_URL || "http://localhost:3999";
        const res = await fetch(`${apiUrl}/v1/addresses/stacks/${address}/names`);
        if (res.ok) {
          const data = await res.json();
          return data.names?.[0] || null;
        }
      } catch (e) {
        console.error("Failed to fetch BNS names", e);
      }
      return null;
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  };

  const handleConnect = async (walletType: "leather" | "xverse") => {
    try {
      await connect(walletType);
      setIsOpen(false);
    } catch (err) {
      console.error("Connection failed", err);
    }
  };

  return (
    <div className="relative">
      {isConnected && address ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => disconnect()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border bg-card-bg hover:bg-opacity-80 hover:text-white rounded-lg transition-colors text-text-secondary"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="font-mono">{bnsName || truncateAddress(address)}</span>
            <LogOut className="w-4 h-4 ml-1 opacity-70" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-gradient-to-r from-orange to-violet text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 active:scale-95 transition-all shadow-md shadow-violet/10"
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-card-bg border border-border rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Connect Stacks Wallet</h3>
            <p className="text-sm text-text-secondary mb-6">
              Select a Stacks wallet below to connect to StreamPay.
            </p>

            <div className="space-y-3">
              {/* Leather Wallet Option */}
              <button
                onClick={() => handleConnect("leather")}
                className="w-full flex items-center justify-between p-4 bg-dark-bg hover:bg-opacity-50 border border-border hover:border-orange/50 rounded-lg group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center font-bold text-orange text-lg">
                    L
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">Leather Wallet</p>
                    <p className="text-xs text-text-secondary">
                      {hasLeather ? "Extension detected" : "Hiro browser extension"}
                    </p>
                  </div>
                </div>
                {hasLeather ? (
                  <Check className="w-5 h-5 text-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <span className="text-xs font-semibold px-2 py-1 bg-border rounded text-text-secondary">
                    Not found
                  </span>
                )}
              </button>

              {/* Xverse Wallet Option */}
              <button
                onClick={() => handleConnect("xverse")}
                className="w-full flex items-center justify-between p-4 bg-dark-bg hover:bg-opacity-50 border border-border hover:border-violet/50 rounded-lg group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet/10 flex items-center justify-center font-bold text-violet text-lg">
                    X
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">Xverse Wallet</p>
                    <p className="text-xs text-text-secondary">
                      {hasXverse ? "Extension detected" : "Bitcoin & Stacks wallet"}
                    </p>
                  </div>
                </div>
                {hasXverse ? (
                  <Check className="w-5 h-5 text-violet opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <span className="text-xs font-semibold px-2 py-1 bg-border rounded text-text-secondary">
                    Not found
                  </span>
                )}
              </button>
            </div>

            {/* Wallet Not Detected Prompt */}
            {!hasLeather && !hasXverse && (
              <div className="mt-6 p-4 bg-orange/5 border border-orange/20 rounded-lg flex gap-3 text-sm text-orange/90">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No Stacks Wallet Detected</p>
                  <p className="text-xs text-orange/70 mt-1">
                    To interact with StreamPay, you need a Stacks browser extension. We recommend Xverse.
                  </p>
                  <a
                    href="https://www.xverse.app/download"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold underline mt-2 hover:text-white transition-colors"
                  >
                    Install Xverse
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default WalletConnect;
