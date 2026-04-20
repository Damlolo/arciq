"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ScoreCard } from "@/components/ScoreCard";
import { VaultCard } from "@/components/VaultCard";
import { LoanCard } from "@/components/LoanCard";
import { MarketList } from "@/components/MarketList";
import { BorrowPanel } from "@/components/BorrowPanel";
import { ProfileCard } from "@/components/ProfileCard";
import { LoopFlow } from "@/components/LoopFlow";
import { PredictionsTab } from "@/components/PredictionsTab";
import { CreateMarketPanel } from "@/components/CreateMarketPanel";
import { LeaderboardTab } from "@/components/LeaderboardTab";
import { AnalyticsTab } from "@/components/AnalyticsTab";
import { useUSDCBalance, useReputation } from "@/hooks/useProtocol";
import { useScoreSync } from "@/hooks/useSupabase";
import { formatUSDC } from "@/lib/contracts";

export const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }

type Tab = "DASHBOARD" | "PREDICT" | "MY PREDICTIONS" | "BORROW" | "CREATE MARKET" | "LEADERBOARD" | "ANALYTICS" | "FAUCET" | "PROFILE";

// SVG icon components — monochrome, no emoji
function SunIcon({ cls }: { cls: string }) {
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>;
}
function MoonIcon({ cls }: { cls: string }) {
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>;
}
function LockIcon({ cls }: { cls: string }) {
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>;
}
function MenuIcon({ cls }: { cls: string }) {
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>;
}
function CloseIcon({ cls }: { cls: string }) {
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>;
}

function Sidebar({ tab, setTab, score, mobileOpen, setMobileOpen }: {
  tab: Tab; setTab: (t: Tab) => void; score: number;
  mobileOpen: boolean; setMobileOpen: (v: boolean) => void;
}) {
  const { dark, toggle } = useTheme();
  const { address } = useAccount();
  const { balance } = useUSDCBalance();
  const canCreate = score >= 75;

  const tabs: { id: Tab; locked?: boolean }[] = [
    { id: "DASHBOARD" }, { id: "PREDICT" }, { id: "MY PREDICTIONS" },
    { id: "BORROW" }, { id: "CREATE MARKET", locked: !canCreate },
    { id: "LEADERBOARD" }, { id: "ANALYTICS" },
    { id: "FAUCET" }, { id: "PROFILE" },
  ];

  const bg = dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-200";
  const activeBtn = dark ? "bg-gray-800 text-white font-bold" : "bg-gray-100 text-gray-900 font-bold";
  const inactiveBtn = dark ? "text-gray-500 hover:bg-gray-900 hover:text-gray-300" : "text-gray-400 hover:bg-gray-50 hover:text-gray-700";
  const lockedBtn = dark ? "text-gray-700 cursor-not-allowed" : "text-gray-300 cursor-not-allowed";
  const divider = dark ? "border-gray-800" : "border-gray-100";

  const handleTabClick = (t: Tab, locked?: boolean) => {
    if (locked) return;
    setTab(t);
    setMobileOpen(false);
  };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-52 flex flex-col border-r transition-transform duration-200 ${bg} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className={`h-20 flex items-center gap-3 px-4 border-b ${divider}`}>
          <img src="/logo.png" alt="ArcIQ" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          <div className="min-w-0">
            <div className={`font-bold text-base leading-none ${dark ? "text-white" : "text-gray-900"}`}>ArcIQ</div>
            <div className="text-xs text-gray-400 mt-1">Arc Testnet</div>
          </div>
          <button onClick={() => setMobileOpen(false)} className={`ml-auto lg:hidden ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
            <CloseIcon cls="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => handleTabClick(t.id, t.locked)}
              title={t.locked ? `ArcIQ score ≥ 75 required (yours: ${score}) · 1,000 USDC fee` : ""}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs tracking-wide transition-colors flex items-center justify-between gap-2 ${
                tab === t.id ? activeBtn : t.locked ? lockedBtn : inactiveBtn
              }`}>
              <span>{t.id}</span>
              {t.locked && <LockIcon cls="w-3 h-3 shrink-0 opacity-50" />}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className={`px-2 py-3 border-t space-y-1.5 ${divider}`}>
          {address && (
            <div className={`px-3 py-2 rounded-lg text-xs ${dark ? "bg-gray-900 text-gray-400" : "bg-gray-50 text-gray-500"}`}>
              <div className="font-medium truncate">{address.slice(0,6)}…{address.slice(-4)}</div>
              <div className="mt-0.5 text-gray-400">{formatUSDC(balance)} USDC</div>
            </div>
          )}
          <button onClick={toggle} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${dark ? "text-gray-400 hover:bg-gray-900 hover:text-gray-300" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
            <span>{dark ? "Dark mode" : "Light mode"}</span>
            {dark ? <MoonIcon cls="w-3.5 h-3.5" /> : <SunIcon cls="w-3.5 h-3.5" />}
          </button>
          <div className="w-full"><ConnectButton /></div>
        </div>
      </aside>
    </>
  );
}

export default function Home() {
  const { isConnected, address } = useAccount();
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("arciq-theme") === "dark";
  });
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "DASHBOARD";
    return (localStorage.getItem("arciq-tab") as Tab) ?? "DASHBOARD";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { score } = useReputation(address);
  useScoreSync(); // auto-syncs score to Supabase leaderboard

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("arciq-theme", dark ? "dark" : "light");
  }, [dark]);

  const setTabPersisted = (t: Tab) => {
    setTab(t);
    localStorage.setItem("arciq-tab", t);
  };

  const toggle = () => setDark(d => !d);

  if (!isConnected) return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div className={`min-h-screen ${dark ? "bg-gray-950" : "bg-gray-50"}`}>
        <LandingHero dark={dark} toggle={toggle} />
      </div>
    </ThemeContext.Provider>
  );

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div className={`flex min-h-screen ${dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
        <Sidebar tab={tab} setTab={setTabPersisted} score={score} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile topbar */}
          <div className={`lg:hidden h-14 flex items-center justify-between px-4 border-b ${dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-200"}`}>
            <button onClick={() => setMobileOpen(true)} className={dark ? "text-gray-400" : "text-gray-500"}>
              <MenuIcon cls="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="ArcIQ" className="w-8 h-8 rounded-lg object-cover" />
              <span className={`font-bold text-sm ${dark ? "text-white" : "text-gray-900"}`}>ArcIQ</span>
            </div>
            <ConnectButton />
          </div>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
              <TabContent tab={tab} score={score} dark={dark} />
            </div>
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

function SectionHead({ title, dark }: { title: string; dark: boolean }) {
  return <h1 className={`text-base font-bold mb-5 uppercase tracking-wide ${dark ? "text-gray-300" : "text-gray-600"}`}>{title}</h1>;
}

function TabContent({ tab, score, dark }: { tab: Tab; score: number; dark: boolean }) {
  if (tab === "DASHBOARD") return (
    <div className="space-y-5">
      <SectionHead title="Dashboard" dark={dark} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <VaultCard /><ScoreCard /><LoanCard />
      </div>
      <div>
        <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Active Markets</p>
        <MarketList viewOnly />
      </div>
    </div>
  );
  if (tab === "PREDICT") return <div><SectionHead title="Predict" dark={dark} /><MarketList /></div>;
  if (tab === "MY PREDICTIONS") return <div><SectionHead title="My Predictions" dark={dark} /><PredictionsTab /></div>;
  if (tab === "BORROW") return <div><SectionHead title="Borrow" dark={dark} /><BorrowPanel /></div>;
  if (tab === "CREATE MARKET") return <div><SectionHead title="Create Market" dark={dark} /><CreateMarketPanel score={score} dark={dark} /></div>;
  if (tab === "LEADERBOARD") return <div><SectionHead title="Leaderboard" dark={dark} /><LeaderboardTab /></div>;
  if (tab === "ANALYTICS") return <div><SectionHead title="Analytics" dark={dark} /><AnalyticsTab /></div>;
  if (tab === "FAUCET") return <div><SectionHead title="Testnet Faucet" dark={dark} /><FaucetTab dark={dark} /></div>;
  if (tab === "PROFILE") return <div><SectionHead title="Profile" dark={dark} /><ProfileCard /></div>;
  return null;
}

function FaucetTab({ dark }: { dark: boolean }) {
  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const txt = dark ? "text-gray-400" : "text-gray-500";
  const info = dark ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-500";
  const net = dark ? "bg-gray-800 text-gray-500 font-mono" : "bg-gray-50 text-gray-500 font-mono";
  return (
    <div className={`rounded-xl border p-8 text-center ${card}`}>
      <div className="flex justify-center mb-4">
        <img src="/usdc-logo.png" alt="USDC" className="w-12 h-12 rounded-full" />
      </div>
      <h2 className={`text-base font-bold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>Get Testnet USDC</h2>
      <p className={`text-sm mb-6 max-w-sm mx-auto ${txt}`}>
        ArcIQ runs on Arc Testnet. USDC is the native gas token — get free testnet USDC from the Circle faucet to start predicting and borrowing.
      </p>
      <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${dark ? "bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700" : "bg-gray-900 text-white hover:bg-gray-700"}`}>
        Open Circle Faucet
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
      <div className={`mt-8 text-left rounded-lg p-4 space-y-1.5 text-sm ${info}`}>
        <p className={`font-semibold mb-2 ${dark ? "text-gray-300" : "text-gray-600"}`}>Steps</p>
        {["1. Click the button above","2. Select Arc Testnet from the network dropdown","3. Paste your wallet address","4. Request USDC — arrives in seconds","5. Deposit into the Vault to start predicting"].map(s => (
          <p key={s}>{s}</p>
        ))}
      </div>
      <div className={`mt-3 rounded-lg p-3 text-xs text-left ${net}`}>
        Chain ID: 5042002 · RPC: https://rpc.testnet.arc.network · Explorer: https://testnet.arcscan.app
      </div>
    </div>
  );
}

function LandingHero({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const txt = dark ? "text-gray-400" : "text-gray-500";
  return (
    <div className="text-center py-16 px-4">
      <div className="flex justify-end max-w-4xl mx-auto mb-6">
        <button onClick={toggle} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-colors ${dark ? "bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
          {dark ? <><MoonIcon cls="w-3 h-3" /> Dark</> : <><SunIcon cls="w-3 h-3" /> Light</>}
        </button>
      </div>
      <div className="flex justify-center mb-6">
        <img src="/logo.png" alt="ArcIQ" className="w-28 h-28 rounded-2xl object-cover shadow-lg" />
      </div>
      <div className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-5 ${dark ? "bg-gray-900 text-gray-400 border border-gray-800" : "bg-gray-100 text-gray-500"}`}>
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
        Live on Arc Network
      </div>
      <h1 className={`text-4xl font-bold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>Predict smarter.<br />Borrow better.</h1>
      <p className={`text-base max-w-md mx-auto mb-8 ${txt}`}>Stake USDC, forecast crypto prices, build your ArcIQ score, and unlock better loan-to-value ratios.</p>
      <LoopFlow />
      <div className="mt-8"><ConnectButton size="lg" /></div>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
        {[
          { title: "Predict", desc: "YES/NO markets on BTC, ETH, SOL and more." },
          { title: "Score", desc: "Win predictions to grow your ArcIQ score via EMA." },
          { title: "Borrow", desc: "Higher score unlocks higher LTV and more borrowing power." },
        ].map(f => (
          <div key={f.title} className={`rounded-xl border p-5 ${card}`}>
            <div className={`font-bold mb-1 text-sm ${dark ? "text-white" : "text-gray-900"}`}>{f.title}</div>
            <div className={`text-sm ${txt}`}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
