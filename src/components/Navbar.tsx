"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useCircleWalletContext } from "@/lib/circleWallet";
import { formatUsdc } from "../lib/contracts";
import { useProtocol } from "../hooks/useProtocol";

// ─── Score tier helper ────────────────────────────────────────────────────────
function scoreTier(s: number) {
  if (s >= 90) return { label: "Elite",    color: "#A78BFA", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)" };
  if (s >= 70) return { label: "Advanced", color: "#38BDF8", bg: "rgba(56,189,248,0.1)",   border: "rgba(56,189,248,0.2)"  };
  if (s >= 50) return { label: "Standard", color: "#818CF8", bg: "rgba(99,102,241,0.1)",   border: "rgba(99,102,241,0.2)"  };
  return           { label: "Beginner",  color: "#94A3B8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)" };
}

// ─── Connect Button ──────────────────────────────────────────────────────────
export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending }   = useConnect();
  const { disconnect }           = useDisconnect();
  const { usdcBalance, score }   = useProtocol();

  if (!isConnected) {
    return (
      <button
        onClick={() => connect()}
        disabled={isPending}
        className="btn-primary flex items-center gap-2 text-[13px] px-4 py-2 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Connecting…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3m18-3V6" />
            </svg>
            Connect Wallet
          </>
        )}
      </button>
    );
  }

  const tier = scoreTier(score);

  return (
    <div className="flex items-center gap-2.5">
      {/* Score pill */}
      <div
        className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 border text-[12px]"
        style={{ background: tier.bg, borderColor: tier.border, color: tier.color }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <span className="font-bold">{score}</span>
        <span className="opacity-70">{tier.label}</span>
      </div>

      {/* Balance pill */}
      <div className="hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-1.5 border border-[var(--border-default)] bg-white/4 text-[12px]">
        <Image src="/usdc-logo.png" alt="USDC" width={14} height={14} className="rounded-full" />
        <span className="text-[var(--text-muted)]">Balance</span>
        <span className="font-bold text-[var(--text-primary)]">${formatUsdc(usdcBalance)}</span>
      </div>

      {/* Account menu */}
      <AccountMenu address={address} disconnect={disconnect} />
    </div>
  );
}

// ─── Account menu ─────────────────────────────────────────────────────────────
// Icon cluster in the navbar: click to open a small panel showing the signed-in
// email (Circle logins only — not shown for an externally-connected wallet),
// the wallet address (tap to copy), and a power icon to disconnect.
function AccountMenu({
  address,
  disconnect,
}: {
  address: `0x${string}` | undefined;
  disconnect: () => void;
}) {
  const { email } = useCircleWalletContext();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleCopy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 border border-[var(--border-default)] bg-white/4 hover:bg-white/7 hover:border-[var(--border-strong)] transition-all text-[12px] font-mono text-[var(--text-secondary)]"
      >
        <span className="w-2 h-2 rounded-full bg-[var(--yes-color)]" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
        {address?.slice(0, 6)}…{address?.slice(-4)}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-default)] z-50"
          style={{ background: "var(--bg-elevated)" }}
        >
          {email && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
              <svg className="w-4 h-4 shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Email</p>
                <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{email}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-white/5 transition-colors text-left"
          >
            <svg className="w-4 h-4 shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3m18-3V6" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Wallet</p>
              <p className="text-[13px] font-mono font-medium text-[var(--text-primary)] truncate">{address}</p>
            </div>
            <span className="text-[10px] font-semibold text-[var(--text-muted)] shrink-0">{copied ? "Copied!" : "Copy"}</span>
          </button>

          <button
            onClick={() => { setOpen(false); disconnect(); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-left group"
          >
            <svg className="w-4 h-4 shrink-0 text-red-400 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
            </svg>
            <span className="text-[13px] font-medium text-red-400">Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-[var(--bg-base)]/80 backdrop-blur-2xl border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-15 flex items-center justify-between" style={{ height: "60px" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/25 flex items-center justify-center">
            <Image src="/logo.png" alt="Lendiq Logo" width={26} height={26} className="rounded-lg object-contain" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[17px] font-black tracking-tight text-[var(--text-primary)]">Lend</span>
            <span className="text-[17px] font-black tracking-tight" style={{ color: "var(--accent-secondary)" }}>iq</span>
          </div>
        </div>

        {/* Connect */}
        <ConnectButton />
      </div>
    </nav>
  );
}
