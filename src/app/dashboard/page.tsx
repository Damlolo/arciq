"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useTheme } from "../providers";
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

// ─── Professional SVG Icons ──────────────────────────────────────────────────

const Icons = {
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
  analytics: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  ),
};

// ─── Tab definitions ────────────────────────────────────────────────────────

type Tab = "dashboard" | "borrow" | "predict" | "faucet" | "analytics";

const TABS: { id: Tab; label: string; icon: keyof typeof Icons }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "borrow",    label: "Borrow",    icon: "borrow"    },
  { id: "predict",   label: "Predict",   icon: "predict"   },
  { id: "faucet",     label: "Faucet",     icon: "faucet"    },
  { id: "analytics", label: "Analytics", icon: "analytics" },
];

// ─── Connect Wallet Gate ─────────────────────────────────────────────────────

function ConnectWalletGate() {
  const { connect, isPending } = useConnect();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      {/* Full-page gate */}
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-8">
        <div className="relative max-w-md w-full">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none -z-10">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-blue-600/10 blur-3xl" />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 text-center shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-28 h-28 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="ArcIQ"
                  width={80}
                  height={80}
                  className="rounded-2xl object-contain"
                />
              </div>
            </div>

            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
              Connect your wallet
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">
              Connect your wallet to access the ArcIQ dashboard, start predicting, deposit into the vault, and build your on-chain credit score.
            </p>

            {/* Connect button */}
            <button
              onClick={() => connect({ connector: injected() })}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-wait text-white font-semibold py-4 rounded-2xl transition-all hover:-translate-y-0.5 text-[15px] mb-4"
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

            {/* Network info */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Arc Testnet · Chain ID 5042002 · Gas paid in USDC
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs border-gray-800 text-gray-600">
        ArcIQ · Built on Arc Network ·{" "}
        <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer"
          className="underline hover:text-gray-400">ArcScan</a>
      </footer>
    </div>
  );
}

// ─── Score Tips ──────────────────────────────────────────────────────────────

function ScoreTips() {
  const tips = [
    {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Predict correctly",
      desc: "Each correct market prediction adds points to your ArcIQ score.",
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      title: "Stay consistent",
      desc: "A streak of correct predictions multiplies your score gains.",
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
        </svg>
      ),
      title: "Repay loans on time",
      desc: "Timely repayments signal creditworthiness and boost your score.",
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
        </svg>
      ),
      title: "Deposit into the vault",
      desc: "Active deposits show protocol participation and raise your tier.",
    },
  ];

  return (
    <div className="rounded-2xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <p className="text-xs font-semibold uppercase tracking-wider mb-4 text-gray-500 dark:text-gray-400">
        How to increase your score
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tips.map((tip) => (
          <div key={tip.title} className="flex gap-3 rounded-xl p-3 bg-gray-100 dark:bg-gray-800/60">
            <span className="shrink-0 mt-0.5 text-blue-500 dark:text-blue-400">{tip.icon}</span>
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">{tip.title}</p>
              <p className="text-xs mt-0.5 leading-relaxed text-gray-600 dark:text-gray-400">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab panels ─────────────────────────────────────────────────────────────

function DashboardTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Borrow USDC</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Lock collateral from your vault balance and borrow at 5% APR. Your ArcIQ score
            determines your maximum LTV — predict accurately to borrow more.
          </p>
        </div>
        <BorrowPanel />
      </div>
      <div><YieldCard /></div>
    </div>
  );
}

function PredictTab() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-4">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prediction Markets</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Stake USDC on YES / NO outcomes. Correct predictions raise your ArcIQ score,
            unlocking higher yield multipliers and borrow limits.
          </p>
        </div>
        <MarketList />
      </div>
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">My Predictions</h2>
          <PredictionsTab />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Create Market</h2>
          <CreateMarketPanel />
        </div>
      </div>
    </div>
  );
}

function FaucetTab() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Image
          src="/usdc-logo.png"
          alt="USDC"
          width={48}
          height={48}
          className="rounded-full object-contain flex-shrink-0"
        />
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">USDC Testnet Faucet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Get testnet USDC from Circle's official faucet to use on ArcIQ. Connect your
            wallet and request tokens — they arrive on the Arc testnet within seconds.
          </p>
        </div>
      </div>

      <div className="border rounded-2xl p-5 mb-6 flex gap-4 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20">
        <span className="shrink-0 mt-0.5 text-blue-500 dark:text-blue-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold mb-1 text-blue-700 dark:text-blue-300">How to get testnet USDC</p>
          <ol className="text-xs space-y-1 list-decimal list-inside text-blue-600/80 dark:text-blue-200/70">
            <li>Click the button below to open Circle's faucet</li>
            <li>Connect your wallet on the faucet page</li>
            <li>Select the Arc testnet (Chain ID 5042002)</li>
            <li>Request USDC — funds appear in your wallet shortly</li>
            <li>Return here to deposit into the vault and start earning</li>
          </ol>
        </div>
      </div>

      <a
        href="https://faucet.circle.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-colors text-sm group"
      >
        <Image
          src="/usdc-logo.png"
          alt="USDC"
          width={20}
          height={20}
          className="rounded-full object-contain"
        />
        Open Circle USDC Faucet
        <span className="opacity-60 group-hover:opacity-100 transition-opacity">{Icons.externalLink}</span>
      </a>

      <div className="mt-6 border rounded-2xl p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-gray-500 dark:text-gray-400">
          Arc Testnet Details
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Network name", value: "Arc Testnet" },
            { label: "Chain ID",     value: "5042002" },
            { label: "Currency",     value: "USDC" },
            { label: "Explorer",     value: "testnet.arcscan.app" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 bg-gray-100 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-sm font-semibold mt-0.5 break-all text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
        <a
          href="https://testnet.arcscan.app"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {Icons.externalLink}
          Open ArcScan block explorer
        </a>
      </div>
    </div>
  );
}

// ─── Root layout ─────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "dashboard";
    const param = new URLSearchParams(window.location.search).get("tab");
    const valid: Tab[] = ["dashboard", "borrow", "predict", "faucet", "analytics"];
    return valid.includes(param as Tab) ? (param as Tab) : "dashboard";
  });

  // Sync active tab to URL query param so refresh restores the same tab
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState(null, "", url.toString());
  }, [activeTab]);
  const { isDark, toggle } = useTheme();
  const { isConnected } = useAccount();

  // ── Wallet gate: show connect screen if not connected ──
  if (!isConnected) {
    return <ConnectWalletGate />;
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-950 text-white">
      <Navbar />

      {/* ── Tab bar ── */}
      <div className="sticky top-14 z-40 backdrop-blur border-b transition-colors duration-300 bg-white/90 dark:bg-gray-950/90 border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
          <div className="flex items-center">
            <div className="flex flex-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex-1 flex items-center justify-center gap-1.5 sm:gap-2
                    py-3 sm:py-3.5 text-xs sm:text-sm font-medium
                    transition-colors select-none
                    ${activeTab === tab.id
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }
                  `}
                >
                  <span className={activeTab === tab.id ? "text-blue-500 dark:text-blue-400" : "opacity-40"}>
                    {Icons[tab.icon]}
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.id && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 dark:bg-blue-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={toggle}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="ml-1 sm:ml-3 p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 flex-shrink-0"
            >
              {isDark ? Icons.sun : Icons.moon}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "borrow"    && <BorrowTab />}
        {activeTab === "predict"   && <PredictTab />}
        {activeTab === "faucet"    && <FaucetTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t mt-12 py-6 text-center text-xs transition-colors duration-300 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600">
        ArcIQ · Built on Arc Network (Chain ID 5042002) · Gas paid in USDC ·{" "}
        <a
          href="https://testnet.arcscan.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-700 dark:hover:text-gray-400"
        >
          ArcScan
        </a>
      </footer>
    </div>
  );
}
