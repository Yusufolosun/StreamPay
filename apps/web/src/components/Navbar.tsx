"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./WalletConnect";
import { useBlockHeight } from "../hooks/useBlockHeight";
import { Database, Send, Inbox, Landmark, Compass, LayoutDashboard } from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const blockHeight = useBlockHeight();

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Send", href: "/send", icon: Send },
    { name: "Receive", href: "/receive", icon: Inbox },
    { name: "Milestones", href: "/milestones", icon: Landmark },
    { name: "Explorer", href: "/explorer", icon: Compass },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-dark-bg/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange to-violet flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange/15 transition-transform group-hover:scale-105">
                S
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-orange to-violet bg-clip-text text-transparent">
                StreamPay
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "text-white bg-white/5 border border-border"
                      : "text-text-secondary hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right actions: block height & connect */}
          <div className="flex items-center gap-4">
            {blockHeight > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card-bg border border-border rounded-lg text-xs font-medium text-text-secondary">
                <Database className="w-3.5 h-3.5 text-orange animate-pulse" />
                <span>Block:</span>
                <span className="font-mono text-white">{blockHeight}</span>
              </div>
            )}
            <WalletConnect />
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
