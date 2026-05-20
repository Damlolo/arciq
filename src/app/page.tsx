"use client";

import Link from "next/link";
import Image from "next/image";

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    color: "blue",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "ArcIQ Score",
    desc: "Your on-chain reputation, built from prediction accuracy and protocol participation. Higher score = better terms on everything.",
  },
  {
    color: "cyan",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Prediction Markets",
    desc: "Stake USDC on YES/NO outcomes across curated markets. Correct calls increase your score and unlock premium protocol benefits.",
  },
  {
    color: "green",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
      </svg>
    ),
    title: "Collateralised Lending",
    desc: "Borrow USDC at a flat 5% APR against your vault deposits. Your ArcIQ score determines your maximum loan-to-value ratio.",
  },
  {
    color: "purple",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Yield Engine",
    desc: "Earn from borrow interest, prediction fees, and liquidation penalties. Elite predictors access a bonus pool ring-fenced just for them.",
  },
  {
    color: "blue",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: "Live Dashboard",
    desc: "Track your ArcIQ in real time. See claimable yield, score progress, vault balances, and active loan positions at a glance.",
  },
  {
    color: "cyan",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    title: "Fully On-Chain",
    desc: "All scores, loans, and yield distributions settle on Arc Network. No oracles, no admin keys — just transparent, verifiable code.",
  },
];

const TIERS = [
  { name: "Beginner", range: "0 – 49",  mult: "1.0×", ltv: "50% LTV",  color: "slate",  featured: false },
  { name: "Standard", range: "50 – 69", mult: "1.2×", ltv: "60% LTV",  color: "blue",   featured: false },
  { name: "Advanced", range: "70 – 89", mult: "1.5×", ltv: "70% LTV",  color: "cyan",   featured: false },
  { name: "Elite",    range: "90+",     mult: "2.0×", ltv: "85% LTV + bonus pool", color: "yellow", featured: true },
];

const STEPS = [
  {
    n: "01",
    title: "Deposit USDC into the vault",
    desc: "Your vault balance is the foundation. Deposits earn yield and can be locked as collateral for borrowing. Your yield multiplier starts at 1× and grows with your score.",
  },
  {
    n: "02",
    title: "Predict on markets to build your ArcIQ score",
    desc: "Stake USDC on YES or NO outcomes. Every correct call pushes your score higher. Streaks multiply your gains. Wrong predictions cost a small fee — accuracy matters.",
  },
  {
    n: "03",
    title: "Borrow more and earn more as your score grows",
    desc: "A higher ArcIQ unlocks a higher LTV on loans and a higher yield multiplier on vault deposits. Reach 90+ for the Elite tier and access the exclusive bonus yield pool.",
  },
];

const featureIconBg: Record<string, string> = {
  blue:   "bg-blue-500/15 text-blue-400",
  cyan:   "bg-cyan-500/12 text-cyan-400",
  green:  "bg-emerald-500/12 text-emerald-400",
  purple: "bg-violet-500/12 text-violet-400",
};

const tierBadge: Record<string, string> = {
  slate:  "bg-slate-500/15 text-slate-300",
  blue:   "bg-blue-500/15 text-blue-400",
  cyan:   "bg-cyan-500/15 text-cyan-400",
  yellow: "bg-yellow-500/15 text-yellow-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080b14] text-white overflow-x-hidden">

      <style>{`
        @keyframes pulse-dot { 0%,100% { opacity:1 } 50% { opacity:0.35 } }
      `}</style>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-12 h-16 bg-[#080b14]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Image
            src="/logo.png"
            alt="ArcIQ Logo"
            width={44}
            height={44}
            className="rounded-xl object-contain"
          />
          <div className="text-lg font-black tracking-tight">
            Arc<span className="text-blue-400">IQ</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {["Features", "How it works", "Score tiers"].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
              className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors">
              {l}
            </a>
          ))}
        </div>
        <Link href="/dashboard"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5">
          Launch App
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute left-1/4 bottom-0 w-[400px] h-[300px] rounded-full bg-emerald-500/6 blur-3xl" />
          <div className="absolute right-1/4 bottom-0 w-[400px] h-[300px] rounded-full bg-cyan-500/6 blur-3xl" />
        </div>

        <div className="relative inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-[12px] font-medium text-slate-300 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
          Live on Arc Testnet · Chain ID 5042002 · Gas paid in USDC
        </div>

        <h1 className="relative font-black tracking-tight leading-none mb-6" style={{ fontSize: "clamp(52px,9vw,96px)" }}>
          Predict Smarter.<br />
          <span className="text-blue-400">Borrow Better.</span><br />
          <span className="text-cyan-400">Earn More.</span>
        </h1>

        <p className="relative text-slate-400 max-w-lg leading-relaxed mb-14" style={{ fontSize: "clamp(15px,2vw,18px)" }}>
          Your on-chain credit score, built from prediction accuracy. Forecast markets, raise your ArcIQ, and unlock higher borrow limits and yield multipliers.
        </p>

        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <Link href="/dashboard"
            className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 text-[15px]">
            Launch App
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <a href="#how-it-works"
            className="flex items-center gap-2.5 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white font-medium px-7 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 text-[15px]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            How it works
          </a>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-y border-white/[0.06] bg-[#0d1220]">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-0 divide-y md:divide-y-0 divide-x-0 md:divide-x divide-white/[0.06]">
          {[
            { val: "5%",   label: "Fixed borrow APR" },
            { val: "2×",   label: "Max yield multiplier" },
            { val: "90+",  label: "Score for elite tier" },
            { val: "100%", label: "On-chain & transparent" },
          ].map(({ val, label }) => (
            <div key={label} className="text-center px-8 py-2">
              <div className="text-3xl font-black tracking-tight text-blue-400">{val}</div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-blue-400 mb-4">Core features</div>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Everything you need.<br />Nothing you don't.
        </h2>
        <p className="text-slate-400 text-base leading-relaxed max-w-lg mb-14">
          ArcIQ combines a prediction market, DeFi lending, and an on-chain reputation layer into one unified protocol.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="bg-[#0d1220] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-8 transition-all hover:-translate-y-1">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${featureIconBg[f.color]}`}>
                {f.icon}
              </div>
              <div className="text-[16px] font-bold mb-2.5">{f.title}</div>
              <div className="text-[13px] text-slate-400 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 sm:pb-24">
        <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-blue-400 mb-4">How it works</div>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Three steps to smarter DeFi.</h2>
        <p className="text-slate-400 text-base leading-relaxed max-w-lg mb-14">
          ArcIQ rewards accuracy, not just capital. The more you predict correctly, the better your terms.
        </p>
        <div className="flex flex-col gap-3">
          {STEPS.map((s) => (
            <div key={s.n}
              className="flex gap-6 items-start bg-[#0d1220] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-8 transition-all">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-500/12 border border-blue-500/20 flex items-center justify-center text-[13px] font-black text-blue-400">
                {s.n}
              </div>
              <div>
                <div className="text-[16px] font-bold mb-2">{s.title}</div>
                <div className="text-[13px] text-slate-400 leading-relaxed">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Score tiers ── */}
      <section id="score-tiers" className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 sm:pb-24">
        <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-blue-400 mb-4">Score tiers</div>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Your score, your terms.</h2>
        <p className="text-slate-400 text-base leading-relaxed max-w-lg mb-14">
          Hit 50 for Standard, 70 for Advanced, and 90+ for Elite — each tier unlocks better multipliers and borrow limits.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TIERS.map((t) => (
            <div key={t.name}
              className={`rounded-2xl p-6 text-center border transition-all hover:-translate-y-1
                ${t.featured
                  ? "bg-blue-500/6 border-blue-500/30"
                  : "bg-[#0d1220] border-white/[0.06] hover:border-white/[0.12]"
                }`}>
              <div className={`inline-block text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3 ${tierBadge[t.color]}`}>
                {t.name}
              </div>
              <div className="text-[12px] text-slate-500 mb-2">{t.range}</div>
              <div className="text-[30px] font-black tracking-tight text-white mb-1">{t.mult}</div>
              <div className="text-[11px] text-slate-500 mb-3">Yield multiplier</div>
              <div className="text-[12px] text-slate-400 pt-3 border-t border-white/[0.06]">{t.ltv}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 sm:px-6 pb-14 sm:pb-24">
        <div className="max-w-2xl mx-auto relative bg-[#0d1220] border border-blue-500/20 rounded-3xl p-8 sm:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-blue-600/10 blur-3xl" />
          </div>
          <h2 className="relative text-4xl md:text-5xl font-black tracking-tight mb-4">
            Ready to predict<br /><span className="text-blue-400">smarter?</span>
          </h2>
          <p className="relative text-slate-400 text-[15px] leading-relaxed mb-10">
            Get testnet USDC, deposit into the vault, and start building your ArcIQ score today. The protocol is live on Arc Testnet.
          </p>
          <div className="relative flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard"
              className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 text-[15px]">
              Launch App
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white font-medium px-7 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 text-[15px]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c0 0-6.75 7.313-6.75 11.25a6.75 6.75 0 0013.5 0C18.75 9.563 12 2.25 12 2.25z" />
              </svg>
              Get Testnet USDC
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] px-4 md:px-12 py-6 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-slate-500">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="ArcIQ" width={28} height={28} className="rounded-lg object-contain" />
          <span className="font-black text-sm text-white">Arc<span className="text-blue-400">IQ</span></span>
        </div>
        <div>Built on Arc Network · Chain ID 5042002 ·{" "}
          <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer"
            className="hover:text-slate-300 underline">ArcScan ↗</a>
        </div>
      </footer>

    </div>
  );
}
