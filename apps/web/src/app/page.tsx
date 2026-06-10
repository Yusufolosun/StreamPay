"use client";

import Link from "next/link";
import { Send, Inbox, Landmark, ArrowRight, Zap, Shield, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-violet/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange/10 border border-orange/20 rounded-full text-xs font-semibold text-orange mb-6">
            <Zap className="w-3 h-3" />
            Built on Stacks — Secured by Bitcoin
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-orange via-orange to-violet bg-clip-text text-transparent">
              Stream Payments
            </span>
            <br />
            <span className="text-white">In Real Time</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-8">
            Create continuous payment streams, milestone-based invoices, and
            vesting schedules on the Stacks blockchain. Every block, funds flow.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/send"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange to-orange/80 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-orange/20"
            >
              <Send className="w-4 h-4" />
              Create a Stream
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/receive"
              className="inline-flex items-center gap-2 border border-border bg-card-bg text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-white/5 transition-all"
            >
              <Inbox className="w-4 h-4" />
              View Incoming
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="group p-6 bg-card-bg border border-border rounded-xl hover:border-orange/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center mb-4 group-hover:bg-orange/20 transition-colors">
              <Clock className="w-5 h-5 text-orange" />
            </div>
            <h3 className="font-bold text-white mb-2">Continuous Streams</h3>
            <p className="text-sm text-text-secondary">
              Fund streams that release tokens every block. Recipients claim
              earned funds at any time.
            </p>
          </div>
          <div className="group p-6 bg-card-bg border border-border rounded-xl hover:border-violet/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-violet/10 flex items-center justify-center mb-4 group-hover:bg-violet/20 transition-colors">
              <Landmark className="w-5 h-5 text-violet" />
            </div>
            <h3 className="font-bold text-white mb-2">Milestone Invoices</h3>
            <p className="text-sm text-text-secondary">
              Release funds in stages tied to deliverables. Optional arbiter
              support for dispute resolution.
            </p>
          </div>
          <div className="group p-6 bg-card-bg border border-border rounded-xl hover:border-green-500/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-bold text-white mb-2">Bitcoin-Secured</h3>
            <p className="text-sm text-text-secondary">
              All transactions settle on Stacks with Bitcoin finality. Your
              payments inherit Bitcoin&apos;s security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
