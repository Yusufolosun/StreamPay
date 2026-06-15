"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { lookupName } from "../lib/bns";
import { truncateAddress } from "../lib/validation";

interface AddressDisplayProps {
  address: string;
  className?: string;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({ address, className = "" }) => {
  const [bnsName, setBnsName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    if (!address) return;
    lookupName(address)
      .then((name) => {
        if (active) {
          setBnsName(name);
        }
      })
      .catch((err) => {
        console.error("BNS lookup failed for address", address, err);
      });
    return () => {
      active = false;
    };
  }, [address]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address", err);
    }
  };

  const displayText = bnsName || truncateAddress(address);

  return (
    <div
      onClick={handleCopy}
      className={`relative inline-flex items-center gap-1.5 group/address cursor-pointer select-none py-0.5 px-1 rounded hover:bg-white/5 transition-colors duration-150 ${className}`}
    >
      {/* Hover Tooltip showing full SP address / Copied state */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs text-white bg-dark-bg border border-border rounded shadow-xl opacity-0 pointer-events-none group-hover/address:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 font-mono">
        {copied ? "Copied!" : address}
      </span>

      <span className="text-white hover:text-orange transition-colors duration-150 font-medium font-mono text-sm">
        {displayText}
      </span>

      {bnsName && (
        <span
          className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold"
          title="Verified BNS Name"
        >
          ✓
        </span>
      )}

      <span className="text-text-secondary hover:text-white transition-colors duration-150">
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 opacity-0 group-hover/address:opacity-100 transition-opacity duration-150" />
        )}
      </span>
    </div>
  );
};

export default AddressDisplay;
