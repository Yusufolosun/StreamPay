"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Coins, Inbox, Send, Loader2, ArrowRight, Info, AlertTriangle, Zap, Clock } from "lucide-react";
import { useWallet } from "../../hooks/useWallet";
import { useNftsByOwner } from "../../lib/queries/nfts";
import { useSenderStreams, useRecipientStreams } from "../../lib/queries/streams";
import { useContractCall } from "../../hooks/useContractCall";
import { useToast } from "../../components/Toast";
import { buildStreamNFTTransfer } from "../../lib/transactions";
import { formatSTX, isValidStacksAddress } from "../../lib/validation";
import { BLOCKS_PER_DAY } from "../../lib/constants";
import { AddressDisplay } from "../../components/AddressDisplay";
import { AddressInput } from "../../components/AddressInput";

export default function NftsPage() {
  const { address, isConnected, connect } = useWallet();
  const toast = useToast();
  const { execute: executeTransfer, isLoading: isTransferring } = useContractCall();

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientTouched, setRecipientTouched] = useState(false);

  // Queries
  const { data: nfts = [], isLoading: isNftsLoading, refetch: refetchNfts } = useNftsByOwner(address);
  const { data: senderStreamsData } = useSenderStreams(address);
  const { data: recipientStreamsData } = useRecipientStreams(address);

  const senderStreams = senderStreamsData?.data || [];
  const recipientStreams = recipientStreamsData?.data || [];

  const recipientValid = isValidStacksAddress(recipientInput);

  const handleOpenTransfer = (nft: any) => {
    setSelectedNft(nft);
    setRecipientInput("");
    setRecipientTouched(false);
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedNft || !recipientValid || !address) return;

    try {
      const tx = buildStreamNFTTransfer(selectedNft.tokenId, address, recipientInput);
      const txId = await executeTransfer(tx);

      if (txId) {
        toast.success(`NFT #${selectedNft.tokenId} transferred successfully.`, txId);
        setTransferModalOpen(false);
        // Invalidate query to remove NFT from gallery
        refetchNfts();
      } else {
        toast.error("Transfer transaction was rejected or aborted.");
      }
    } catch (err) {
      console.error("Failed to transfer NFT", err);
      toast.error("An unexpected error occurred during transfer.");
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet/20 to-orange/20 flex items-center justify-center text-violet mx-auto mb-6 border border-violet/15 shadow-xl shadow-violet/5">
          <Coins className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Connected Wallet Required</h2>
        <p className="text-text-secondary text-sm mb-6 max-w-xs mx-auto">
          Please connect your Stacks wallet to view your Stream Receipt NFTs.
        </p>
        <button
          onClick={() => connect("leather")}
          className="w-full bg-gradient-to-r from-orange to-violet text-white py-3 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 duration-100 transition-transform shadow-lg shadow-violet/15"
          style={{ minHeight: 44 }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  // Group NFTs by type
  const senderNfts = nfts.filter((n) => n.receiptType === "SENDER");
  const recipientNfts = nfts.filter((n) => n.receiptType === "RECIPIENT");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Stream NFT Gallery</h1>
          <p className="text-text-secondary text-sm mt-1">
            Access immediate liquidity by transferring your continuous stream payment receipts.
          </p>
        </div>
      </div>

      {nfts.length === 0 && !isNftsLoading ? (
        <div className="rounded-2xl border border-border bg-card-bg p-8 text-center max-w-xl mx-auto mt-6">
          <Coins className="w-12 h-12 text-text-secondary/40 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">No Stream NFTs Found</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6 leading-relaxed">
            Stream NFTs let you access liquidity today by transferring your future payment rights to a buyer. Currently, you do not own any stream receipt NFTs.
          </p>
          <Link
            href="/send"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange to-orange/80 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 duration-100 transition-transform shadow-lg shadow-orange/20"
            style={{ minHeight: 44 }}
          >
            <Send className="w-4 h-4" />
            Create a Stream
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Sender Receipts */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange"></span>
              Sender Receipts (Clawback Rights)
            </h2>
            {senderNfts.length === 0 ? (
              <p className="text-sm text-text-secondary">You do not own any Sender Receipt NFTs.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {senderNfts.map((nft) => (
                  <NftCard
                    key={nft.tokenId}
                    nft={nft}
                    stream={senderStreams.find((s) => s.id === nft.streamId.toString())}
                    accentColor="orange"
                    onTransfer={handleOpenTransfer}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recipient Receipts */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet"></span>
              Recipient Receipts (Income Claims)
            </h2>
            {recipientNfts.length === 0 ? (
              <p className="text-sm text-text-secondary">You do not own any Recipient Receipt NFTs.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipientNfts.map((nft) => (
                  <NftCard
                    key={nft.tokenId}
                    nft={nft}
                    stream={recipientStreams.find((s) => s.id === nft.streamId.toString())}
                    accentColor="violet"
                    onTransfer={handleOpenTransfer}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModalOpen && selectedNft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card-bg border border-border rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-3">Transfer Receipt NFT</h3>

            {/* Warning banner */}
            <div className="p-4 bg-red-950/60 border border-red-500/30 rounded-lg flex gap-3 text-xs text-red-200 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-bold">Warning</p>
                <p className="mt-1 leading-relaxed">
                  Transferring a {selectedNft.receiptType} receipt gives the new owner all future {selectedNft.receiptType === "RECIPIENT" ? "income" : "clawback"} rights from this stream. This cannot be undone.
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-dark-bg border border-border rounded-lg text-xs space-y-2 mb-4 font-semibold text-text-secondary">
              <p className="text-white text-sm">Token #{selectedNft.tokenId}</p>
              <div className="flex justify-between">
                <span>Receipt Type:</span>
                <span className={`font-bold ${selectedNft.receiptType === "SENDER" ? "text-orange" : "text-violet"}`}>
                  {selectedNft.receiptType}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Counterparty:</span>
                <div className="font-mono text-white text-xs">
                  {selectedNft.counterparty ? <AddressDisplay address={selectedNft.counterparty} /> : "N/A"}
                </div>
              </div>
              <div className="flex justify-between">
                <span>Remaining Value:</span>
                <span className="font-mono text-white">{formatSTX(selectedNft.remainingValue || 0)} STX</span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  Recipient Stacks Address
                </label>
                <AddressInput
                  id="recipient"
                  value={recipientInput}
                  onChange={setRecipientInput}
                  placeholder="SP... or name.btc"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setTransferModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:text-white hover:bg-white/5 active:scale-95 duration-100 transition-transform"
                style={{ minHeight: 44 }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={!recipientValid || isTransferring}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange to-violet text-white font-semibold text-sm rounded-lg hover:opacity-90 active:scale-95 duration-100 transition-transform disabled:opacity-45 disabled:cursor-not-allowed"
                style={{ minHeight: 44 }}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  "Confirm Transfer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NftCardProps {
  nft: any;
  stream: any;
  accentColor: "orange" | "violet";
  onTransfer: (nft: any) => void;
}

function NftCard({ nft, stream, accentColor, onTransfer }: NftCardProps) {
  const [liveValue, setLiveValue] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  const funded = Number(stream?.fundedAmount || "0");
  const claimed = Number(stream?.balance?.withdrawnAmount || "0");
  const ratePerBlock = Number(stream?.ratePerBlock || "0");
  const ratePerDay = ratePerBlock * BLOCKS_PER_DAY;

  const startBlock = stream?.startBlock || 0;
  const currentBlock = stream?.currentBlock || 0;
  const totalBlocks = ratePerBlock > 0 ? funded / ratePerBlock : 0;
  const endBlock = startBlock + totalBlocks;
  const blocksRemaining = Math.max(0, endBlock - currentBlock);
  const daysRemaining = blocksRemaining / BLOCKS_PER_DAY;

  const counterparty = nft.receiptType === "SENDER" ? stream?.recipient : stream?.sender;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 640);
    }
  }, []);

  // Live calculation based on receipt type:
  // RECIPIENT: live claimable balance
  // SENDER: remaining unstreamed (clawback value)
  useEffect(() => {
    if (!stream || stream.status !== "active") {
      if (nft.receiptType === "RECIPIENT") {
        setLiveValue(Number(stream?.balance?.claimableAmount || "0"));
      } else {
        setLiveValue(funded - claimed);
      }
      return;
    }

    const fps = isMobile ? 30 : 60;
    const intervalMs = 1000 / fps;

    const interval = setInterval(() => {
      if (nft.receiptType === "RECIPIENT") {
        // Ticks up claimable balance
        setLiveValue((prev) => {
          const increment = (ratePerBlock / 600) * (intervalMs / 1000);
          return Math.min(prev + increment, funded - claimed);
        });
      } else {
        // Ticks down remaining unstreamed balance
        setLiveValue((prev) => {
          const increment = (ratePerBlock / 600) * (intervalMs / 1000);
          const currentClaimed = claimed;
          const liveStreamed = currentClaimed + (funded - currentClaimed - prev);
          const nextStreamed = liveStreamed + increment;
          return Math.max(0, funded - nextStreamed);
        });
      }
    }, intervalMs);

    // Initial values
    if (nft.receiptType === "RECIPIENT") {
      setLiveValue(Number(stream?.balance?.claimableAmount || "0"));
    } else {
      setLiveValue(funded - claimed); // Initial unstreamed balance estimate
    }

    return () => clearInterval(interval);
  }, [stream, nft.receiptType, claimed, funded, ratePerBlock, isMobile]);

  const borderClass = accentColor === "orange" ? "border-orange/30 hover:border-orange/60" : "border-violet/30 hover:border-violet/60";
  const badgeClass = accentColor === "orange" ? "bg-orange/10 text-orange" : "bg-violet/10 text-violet";
  const textClass = accentColor === "orange" ? "text-orange" : "text-violet";

  return (
    <div className={`relative rounded-xl border bg-card-bg p-5 transition-all duration-300 ${borderClass} flex flex-col justify-between h-72`}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono font-bold text-white text-base">Token #{nft.tokenId}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
            {nft.receiptType}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Counterparty:</span>
            <div className="font-mono text-white text-xs font-semibold">
              {counterparty ? <AddressDisplay address={counterparty} /> : "N/A"}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Stream ID:</span>
            <span className="font-mono text-white font-semibold">#{nft.streamId}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Remaining Duration:</span>
            <span className="text-white font-semibold">
              {blocksRemaining > 0 ? `~${daysRemaining.toFixed(1)} days left` : "Ended"}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-1">
            <span className="text-text-secondary text-xs uppercase font-bold tracking-wider">
              {nft.receiptType === "RECIPIENT" ? "Claimable Balance" : "Clawback Value"}
            </span>
            <span className={`font-mono text-lg font-black ${textClass} tabular-nums`}>
              {formatSTX(liveValue, 4)} <span className="text-xs text-text-secondary">STX</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 mt-4">
        {stream && (
          <Link
            href={`/explorer/streams/${nft.streamId}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border bg-dark-bg text-xs font-bold text-text-secondary hover:text-white transition-all active:scale-95 duration-100 transition-transform"
            style={{ minHeight: 44 }}
          >
            View Stream
          </Link>
        )}
        <button
          onClick={() => onTransfer({ ...nft, counterparty, remainingValue: liveValue })}
          className="flex-1 py-2.5 bg-gradient-to-r from-orange to-violet text-white font-bold text-xs rounded-lg hover:opacity-90 active:scale-95 duration-100 transition-transform"
          style={{ minHeight: 44 }}
        >
          Transfer
        </button>
      </div>
    </div>
  );
}
