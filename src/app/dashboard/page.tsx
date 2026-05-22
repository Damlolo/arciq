"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useTheme } from "../providers";
import { useProtocol } from "../../hooks/useProtocol";
import { Navbar } from "../../components/Navbar";
import { ScoreCard } from "../../components/ScoreCard";
import { VaultCard } from "../../components/VaultCard";
import { YieldCard } from "../../components/YieldCard";
import { ProfileCard } from "../../components/ProfileCard";
import { BorrowPanel } from "../../components/BorrowPanel";
import { MarketList } from "../../components/MarketList";
import { PredictionsTab } from "../../components/PredictionsTab";
import { CreateMarketPanel } from "../../components/CreateMarketPanel";
import { AnalyticsTab } from "../../components/AnalyticsTab";
import { formatUsdc } from "../../lib/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "dashboard" | "borrow" | "predict" | "faucet" | "analytics";
type PredictSub = "markets" | "my-predictions";

// ─── Nav icons ────────────────────────────────────────────────────────────────
const Icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  borrow: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
    </svg>
  ),
  predict: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  faucet: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c0 0-6.75 7.313-6.75 11.25a6.75 6.75 0 0013.5 0C18.75 9.563 12 2.25 12 2.25z" />
    </svg>
  ),
  analytics: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  ),
  sun: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  moon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
  externalLink: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  ),
};

const TABS: { id: Tab; label: string; icon: keyof typeof Icons; desc: string }[] = [
  { id: "dashboard", label: "Dashboard",  icon: "dashboard", desc: "Overview & score" },
  { id: "borrow",    label: "Borrow",     icon: "borrow",    desc: "Loans & yield" },
  { id: "predict",   label: "Predict",    icon: "predict",   desc: "Markets" },
  { id: "faucet",    label: "Faucet",     icon: "faucet",    desc: "Get test USDC" },
  { id: "analytics", label: "Analytics",  icon: "analytics", desc: "Portfolio stats" },
];

// ─── Connect gate ─────────────────────────────────────────────────────────────
function ConnectWalletGate() {
  const { connect, isPending } = useConnect();
  return (
    <div className="min-h-screen grid-texture" style={{ background: "var(--bg-base)" }}>
      <Navbar />
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-60px)] px-4 py-8">
        <div className="relative max-w-md w-full">
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full opacity-20"
              style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, transparent 70%)" }} />
          </div>

          <div className="glass-card p-10 text-center">
            <div className="flex justify-center mb-7">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center animate-glow"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <Image src="/logo.png" alt="ArcIQ" width={64} height={64} className="rounded-2xl object-contain" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-[var(--text-primary)] mb-2 tracking-tight">Connect your wallet</h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xs mx-auto">
              Access the ArcIQ dashboard, predict on markets, deposit into the vault, and build your on-chain credit score.
            </p>

            <button
              onClick={() => connect({ connector: injected() })}
              disabled={isPending}
              className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-[15px] mb-4 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Connecting…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3m18-3V6" />
                  </svg>
                  Connect Wallet
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--yes-color)]" style={{ animation: "pulse-dot 2s infinite" }} />
              Arc Testnet · Chain ID 5042002
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Score tips ───────────────────────────────────────────────────────────────
function ScoreTips() {
  const tips = [
    { icon: "✓", color: "#10B981", title: "Predict correctly",    desc: "Each correct market prediction adds points to your ArcIQ score." },
    { icon: "🔥", color: "#F59E0B", title: "Stay consistent",     desc: "A streak of correct predictions multiplies your score gains." },
    { icon: "💸", color: "#818CF8", title: "Repay loans on time", desc: "Timely repayments signal creditworthiness and boost your score." },
    { icon: "🏦", color: "#38BDF8", title: "Deposit into vault",   desc: "Active deposits show protocol participation and raise your tier." },
  ];
  return (
    <div className="surface-card p-5">
      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4">
        How to increase your score
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tips.map((t) => (
          <div key={t.title} className="flex gap-3 rounded-xl p-3"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <span className="text-base shrink-0">{t.icon}</span>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">{t.title}</p>
              <p className="text-[11px] mt-0.5 leading-relaxed text-[var(--text-muted)]">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mini stat cards strip ────────────────────────────────────────────────────
function StatStrip() {
  const { score, depositBalance, usdcBalance, freeBalance } = useProtocol();
  const stats = [
    { label: "ArcIQ Score",   val: `${score}`,                  color: score >= 90 ? "#A78BFA" : score >= 70 ? "#38BDF8" : "#818CF8" },
    { label: "Vault Balance", val: `$${formatUsdc(depositBalance)}`, color: "var(--yes-color)" },
    { label: "Wallet USDC",   val: `$${formatUsdc(usdcBalance)}`,   color: "var(--text-primary)" },
    { label: "Free Balance",  val: `$${formatUsdc(freeBalance)}`,   color: "var(--text-primary)" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ label, val, color }) => (
        <div key={label} className="stat-card">
          <p className="text-[11px] text-[var(--text-muted)] mb-1.5">{label}</p>
          <p className="text-[20px] font-black tracking-tight" style={{ color }}>{val}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Tab panels ──────────────────────────────────────────────────────────────
function DashboardTab() {
  return (
    <div className="space-y-5">
      <StatStrip />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <ScoreCard />
          <ScoreTips />
        </div>
        <ProfileCard />
      </div>
      <VaultCard />
    </div>
  );
}

function BorrowTab() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <div>
        <div className="mb-5">
          <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Borrow USDC</h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
            Lock collateral from your vault and borrow at 5% fixed APR. Your ArcIQ score determines max LTV.
          </p>
        </div>
        <BorrowPanel />
      </div>
      <div><YieldCard /></div>
    </div>
  );
}

function PredictTab() {
  const [subTab, setSubTab] = useState<PredictSub>("markets");
  const { isDark } = useTheme();
  const { score }  = useProtocol();

  return (
    <div className="space-y-5">
      {/* Subtab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        {([
          { id: "markets",        label: "Markets" },
          { id: "my-predictions", label: "My Predictions" },
        ] as { id: PredictSub; label: string }[]).map((s) => (
          <button
            key={s.id}
            onClick={() => setSubTab(s.id)}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={subTab === s.id ? {
              background: "linear-gradient(135deg, #6366F1, #4F46E5)",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(99,102,241,0.35)"
            } : {
              color: "var(--text-muted)"
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {subTab === "markets" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Prediction Markets</h2>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
              Stake USDC on YES/NO outcomes. Correct predictions raise your ArcIQ score, unlocking higher yield and borrow limits.
            </p>
          </div>
          <MarketList />
        </div>
      )}

      {subTab === "my-predictions" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-1">My Predictions</h2>
            <p className="text-[13px] text-[var(--text-secondary)] mb-4">Track open positions, wins, losses, and claimable winnings.</p>
            <PredictionsTab />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-1">Create Market</h2>
            <p className="text-[13px] text-[var(--text-secondary)] mb-4">Stake 1,000 USDC to launch your own prediction market.</p>
            <CreateMarketPanel score={score} dark={isDark} />
          </div>
        </div>
      )}
    </div>
  );
}

function FaucetTab() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4 mb-2">
        <Image src="/usdc-logo.png" alt="USDC" width={52} height={52} className="rounded-full object-contain shrink-0" />
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">USDC Testnet Faucet</h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
            Get testnet USDC from Circle's official faucet. Connect your wallet, select Arc Testnet, and tokens arrive in seconds.
          </p>
        </div>
      </div>

      {/* Info panel */}
      <div className="surface-card p-5 flex gap-4"
        style={{ borderLeft: "3px solid var(--accent-primary)" }}>
        <svg className="w-5 h-5 shrink-0 mt-0.5 text-[var(--accent-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <div>
          <p className="text-[13px] font-semibold mb-2 text-[var(--text-primary)]">How to get testnet USDC</p>
          <ol className="text-[12px] space-y-1 list-decimal list-inside text-[var(--text-secondary)]">
            <li>Click the button below to open Circle's faucet</li>
            <li>Connect your wallet on the faucet page</li>
            <li>Select the Arc testnet (Chain ID 5042002)</li>
            <li>Request USDC — funds appear in your wallet shortly</li>
            <li>Return here to deposit into the vault and start earning</li>
          </ol>
        </div>
      </div>

      {/* CTA */}
      <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
        className="btn-primary flex items-center justify-center gap-3 w-full py-4 text-[15px]">
        <Image src="/usdc-logo.png" alt="USDC" width={22} height={22} className="rounded-full object-contain" />
        Open Circle USDC Faucet
        {Icons.externalLink}
      </a>

      {/* Network details */}
      <div className="surface-card p-5">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4">Arc Testnet Details</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Network name", value: "Arc Testnet" },
            { label: "Chain ID",     value: "5042002" },
            { label: "Currency",     value: "USDC" },
            { label: "Explorer",     value: "testnet.arcscan.app" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
              <p className="text-[13px] font-bold mt-0.5 break-all text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>
        <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors">
          {Icons.externalLink}
          Open ArcScan block explorer
        </a>
      </div>
    </div>
  );
}

// ─── Root dashboard layout ────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "dashboard";
    const param = new URLSearchParams(window.location.search).get("tab");
    const valid: Tab[] = ["dashboard", "borrow", "predict", "faucet", "analytics"];
    return valid.includes(param as Tab) ? (param as Tab) : "dashboard";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState(null, "", url.toString());
  }, [activeTab]);

  const { isDark, toggle } = useTheme();
  const { isConnected }    = useAccount();

  if (!isConnected) return <ConnectWalletGate />;

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen grid-texture" style={{ background: "var(--bg-base)" }}>
      <Navbar />

      <div className="flex" style={{ minHeight: "calc(100vh - 60px)" }}>
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className="hidden md:flex flex-col shrink-0 sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto"
          style={{
            width: sidebarOpen ? "220px" : "68px",
            background: "var(--bg-surface)",
            borderRight: "1px solid var(--border-subtle)",
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Collapse toggle */}
          <div className="flex items-center justify-end px-3 py-3 border-b border-[var(--border-subtle)]">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {sidebarOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                }
              </svg>
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-1 p-3 flex-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
                title={!sidebarOpen ? tab.label : undefined}
              >
                <span className="shrink-0">{Icons[tab.icon]}</span>
                {sidebarOpen && (
                  <div className="flex flex-col items-start min-w-0 overflow-hidden">
                    <span className="text-[13px] font-semibold leading-tight">{tab.label}</span>
                    {activeTab !== tab.id && (
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight truncate">{tab.desc}</span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* Bottom: theme toggle */}
          <div className="p-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={toggle}
              className="nav-item w-full"
              title={!sidebarOpen ? (isDark ? "Light mode" : "Dark mode") : undefined}
            >
              <span className="shrink-0">{isDark ? Icons.sun : Icons.moon}</span>
              {sidebarOpen && <span className="text-[13px]">{isDark ? "Light mode" : "Dark mode"}</span>}
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile tab bar */}
          <div className="md:hidden sticky top-[60px] z-40 border-b border-[var(--border-subtle)]"
            style={{ background: "var(--bg-base)/90", backdropFilter: "blur(20px)" }}>
            <div className="flex overflow-x-auto scrollbar-none">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[72px] flex flex-col items-center gap-1 py-2.5 px-2 text-[10px] font-semibold transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? "border-[var(--accent-primary)] text-[var(--accent-secondary)]"
                      : "border-transparent text-[var(--text-muted)]"
                  }`}
                >
                  <span className={activeTab === tab.id ? "text-[var(--accent-secondary)]" : "opacity-40"}>
                    {Icons[tab.icon]}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page header */}
          <div className="px-5 md:px-8 pt-7 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">{activeTabMeta.label}</h1>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">{activeTabMeta.desc}</p>
              </div>
              {/* Desktop theme toggle (hidden - it's in sidebar) */}
              <button
                onClick={toggle}
                className="hidden md:flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/4 transition-all"
              >
                {isDark ? Icons.sun : Icons.moon}
                <span className="hidden lg:inline">{isDark ? "Light" : "Dark"}</span>
              </button>
            </div>
          </div>

          {/* Tab content */}
          <main className="flex-1 px-5 md:px-8 pb-10 animate-fade-up">
            {activeTab === "dashboard" && <DashboardTab />}
            {activeTab === "borrow"    && <BorrowTab />}
            {activeTab === "predict"   && <PredictTab />}
            {activeTab === "faucet"    && <FaucetTab />}
            {activeTab === "analytics" && <AnalyticsTab />}
          </main>

          {/* Footer */}
          <footer className="px-5 md:px-8 py-5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>ArcIQ · Built on Arc Network · Chain ID 5042002</span>
            <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
              {Icons.externalLink} ArcScan
            </a>
          </footer>
        </div>
      </div>
    </div>
  );
}
