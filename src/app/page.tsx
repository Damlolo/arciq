"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useCircleWalletContext } from "@/lib/circleWallet";

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedCounter({ target, prefix = "", suffix = "", duration = 1800 }: {
  target: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

// ─── Floating market card preview ─────────────────────────────────────────
function FloatingMarketCard({ question, yes, vol, delay }: {
  question: string; yes: number; vol: string; delay: string;
}) {
  return (
    <div
      className="glass-card p-4 w-64 animate-float"
      style={{ animationDelay: delay, animationDuration: "5s" }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[var(--text-primary)] leading-tight flex-1 mr-2">{question}</p>
        <span className="badge badge-live shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--yes-color)]" style={{ animation: "pulse-dot 2s infinite" }} />
          Live
        </span>
      </div>
      <div className="mb-2.5">
        <div className="flex justify-between text-[10px] mb-1.5">
          <span className="text-[var(--yes-color)] font-semibold">YES {yes}%</span>
          <span className="text-[var(--no-color)] font-semibold">NO {100 - yes}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${yes}%`, background: `linear-gradient(90deg, var(--yes-color), #34D399)` }} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-muted)]">Vol: {vol}</span>
        <div className="flex gap-1.5">
          <button className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--yes-glow)] text-[var(--yes-color)] border border-[var(--yes-color)]/20 hover:bg-[var(--yes-color)] hover:text-white transition-all">YES</button>
          <button className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--no-glow)] text-[var(--no-color)] border border-[var(--no-color)]/20 hover:bg-[var(--no-color)] hover:text-white transition-all">NO</button>
        </div>
      </div>
    </div>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    accent: "#818CF8",
    glow: "rgba(99,102,241,0.12)",
    title: "Lendiq Score",
    desc: "Your on-chain reputation built from prediction accuracy and protocol participation. Higher score = better terms on everything.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    accent: "#10B981",
    glow: "rgba(16,185,129,0.12)",
    title: "Prediction Markets",
    desc: "Stake USDC on YES/NO outcomes across curated markets. Correct calls increase your score and unlock premium protocol benefits.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
      </svg>
    ),
    accent: "#38BDF8",
    glow: "rgba(56,189,248,0.12)",
    title: "Collateralised Lending",
    desc: "Borrow USDC at a flat 5% APR against your vault deposits. Your Lendiq score determines your maximum loan-to-value ratio.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accent: "#A78BFA",
    glow: "rgba(167,139,250,0.12)",
    title: "Yield Engine",
    desc: "Earn from borrow interest, prediction fees, and liquidation penalties. Elite predictors access a bonus pool ring-fenced just for them.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    accent: "#FB923C",
    glow: "rgba(251,146,60,0.12)",
    title: "Live Dashboard",
    desc: "Track your Lendiq in real time. See claimable yield, score progress, vault balances, and active loan positions at a glance.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    accent: "#34D399",
    glow: "rgba(52,211,153,0.12)",
    title: "Fully On-Chain",
    desc: "All scores, loans, and yield distributions settle on Arc Network. No oracles, no admin keys — just transparent, verifiable code.",
  },
];

const TIERS = [
  { name: "Beginner", range: "0 – 49",  mult: "1.0×", ltv: "50% LTV", accent: "#94A3B8", featured: false },
  { name: "Standard", range: "50 – 69", mult: "1.2×", ltv: "60% LTV", accent: "#818CF8", featured: false },
  { name: "Advanced", range: "70 – 89", mult: "1.5×", ltv: "70% LTV", accent: "#38BDF8", featured: false },
  { name: "Elite",    range: "90+",     mult: "2.0×", ltv: "85% LTV + bonus pool", accent: "#A78BFA", featured: true },
];

const STEPS = [
  {
    n: "01",
    title: "Deposit USDC into the vault",
    desc: "Your vault balance is the foundation. Deposits earn yield and can be locked as collateral for borrowing. Your yield multiplier starts at 1× and grows with your score.",
    accent: "#818CF8",
  },
  {
    n: "02",
    title: "Predict on markets to build your Lendiq score",
    desc: "Stake USDC on YES or NO outcomes. Every correct call pushes your score higher. Streaks multiply your gains. Wrong predictions cost a small fee — accuracy matters.",
    accent: "#10B981",
  },
  {
    n: "03",
    title: "Borrow more and earn more as your score grows",
    desc: "A higher Lendiq unlocks a higher LTV on loans and a higher yield multiplier on vault deposits. Reach 90+ for the Elite tier and access the exclusive bonus yield pool.",
    accent: "#A78BFA",
  },
];

// ─── Full-page "finishing sign-in" overlay ────────────────────────────────────
// Bridges the gap after the Google OAuth redirect brings the browser back to
// "/" (Circle's redirectUri is always the site origin, so this is where the
// user lands no matter where they started signing in). Circle's own iframe
// only shows up for SOME of the steps in between (PIN entry, etc) — the rest
// (detecting the completed redirect, provisioning the wallet, polling) has no
// visible UI of its own, which is why it used to look like a plain, static
// landing page for up to ~30s. This keeps something visibly moving the whole
// time instead, and the effect below takes the user into the dashboard the
// moment it's actually ready — no manual "Launch App" click needed.
function SigningInOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--bg-base)]/90 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="w-10 h-10 border-2 border-indigo-400/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] max-w-xs">
          This can take up to 30 seconds the first time — you'll be dropped straight into your dashboard.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Auto-enter the dashboard once sign-in actually finishes ────────────────
  const router = useRouter();
  const { step } = useCircleWalletContext();
  const wasSigningInRef = useRef(false);

  useEffect(() => {
    if (step !== "signedOut" && step !== "restoring" && step !== "ready") {
      wasSigningInRef.current = true;
    }
    if (step === "ready" && wasSigningInRef.current) {
      router.push("/dashboard");
    }
  }, [step, router]);

  // Deliberately NOT gated on `!challengeActive`: when Circle's own challenge
  // iframe actually renders, it forces itself to a full-viewport top layer
  // (see resetStaleChallengeIframe / the forced-visible styling in
  // circleWallet.tsx) and will simply sit on top of this — but for the
  // headless portions of wallet setup that show no Circle UI of their own,
  // this is the only thing telling the user anything is happening at all.
  const showSigningInOverlay =
    wasSigningInRef.current &&
    (step === "authenticating" || step === "needsWallet" || step === "needsPin");

  return (
    <div className="min-h-screen text-[var(--text-primary)] overflow-x-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Grid texture */}
      <div className="fixed inset-0 grid-texture pointer-events-none opacity-40" />

      {showSigningInOverlay && (
        <SigningInOverlay
          label={step === "needsPin" ? "Finishing wallet setup…" : "Signing you in…"}
        />
      )}

      {/* ── Navbar ── */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--bg-base)]/80 backdrop-blur-2xl border-b border-[var(--border-subtle)] shadow-lg"
          : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Image src="/logo.png" alt="Lendiq Logo" width={28} height={28} className="rounded-lg object-contain" />
            </div>
            <span className="text-[17px] font-black tracking-tight">
              Lend<span style={{ color: "var(--accent-secondary)" }}>iq</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {["Features", "How it works", "Score tiers"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all">
                {l}
              </a>
            ))}
          </div>

          <Link href="/dashboard"
            className="btn-primary flex items-center gap-2 text-[13px] px-5 py-2.5">
            Launch App
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[900px] h-[600px] rounded-full opacity-30"
            style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)" }} />
          <div className="absolute left-[10%] top-1/3 w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.2) 0%, transparent 70%)" }} />
          <div className="absolute right-[10%] top-1/3 w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, rgba(167,139,250,0.2) 0%, transparent 70%)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 rounded-full border border-[var(--border-default)] bg-white/3 text-[12px] font-medium text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--yes-color)]"
                  style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
                Live on Arc Testnet · Chain ID 5042002
              </div>

              <h1 className="font-black tracking-tight leading-[1.06] mb-6"
                style={{ fontSize: "clamp(42px,6vw,76px)" }}>
                Predict Smarter.<br />
                <span style={{ background: "linear-gradient(135deg, #818CF8, #6366F1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Borrow Better.
                </span><br />
                <span style={{ background: "linear-gradient(135deg, #10B981, #34D399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Earn More.
                </span>
              </h1>

              <p className="text-[var(--text-secondary)] leading-relaxed mb-10 max-w-md"
                style={{ fontSize: "clamp(15px,1.5vw,18px)" }}>
                Your on-chain credit score, built from prediction accuracy. Forecast markets, raise your Lendiq, and unlock higher borrow limits and yield multipliers — all on-chain.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/dashboard" className="btn-primary flex items-center gap-2.5 text-[15px] px-7 py-3.5">
                  Launch App
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <a href="#how-it-works" className="btn-secondary flex items-center gap-2.5 text-[15px] px-7 py-3.5">
                  How it works
                </a>
              </div>

              {/* Trust signals */}
              <div className="mt-10 flex items-center gap-6">
                {[
                  { label: "Fixed borrow APR", val: "5%" },
                  { label: "Max yield multiplier", val: "2×" },
                  { label: "On-chain & transparent", val: "100%" },
                ].map(({ label, val }) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-xl font-black" style={{ color: "var(--accent-secondary)" }}>{val}</span>
                    <span className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: floating cards preview */}
            <div className="relative hidden lg:flex items-center justify-center h-[460px] animate-fade-up stagger-2">
              {/* Center glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 rounded-full opacity-20"
                  style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, transparent 70%)" }} />
              </div>

              {/* Dashboard preview card */}
              <div className="glass-card p-5 w-72 shadow-2xl z-10 animate-glow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--text-muted)]">Portfolio</span>
                  <span className="badge badge-green">+12.4%</span>
                </div>
                <div className="text-3xl font-black mb-1">$24,830</div>
                <div className="text-[12px] text-[var(--text-muted)] mb-4">Total portfolio value</div>
                {/* Mini chart bars */}
                <div className="flex items-end gap-1 h-14 mb-4">
                  {[40, 55, 45, 70, 60, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm transition-all"
                      style={{
                        height: `${h}%`,
                        background: i === 11
                          ? "linear-gradient(180deg, #818CF8, #6366F1)"
                          : "rgba(99,102,241,0.25)"
                      }} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Lendiq Score", val: "82", color: "#818CF8" },
                    { label: "Yield earned", val: "$1,240", color: "#10B981" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="rounded-xl p-2.5" style={{ background: "var(--bg-elevated)" }}>
                      <div className="text-[10px] text-[var(--text-muted)] mb-0.5">{label}</div>
                      <div className="text-sm font-bold" style={{ color }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating market card top-right */}
              <div className="absolute top-0 right-0">
                <FloatingMarketCard
                  question="Will BTC reach $120k before Q3 2025?"
                  yes={67} vol="$48.2K" delay="0s"
                />
              </div>

              {/* Floating market card bottom-left */}
              <div className="absolute bottom-4 left-0">
                <FloatingMarketCard
                  question="Will ETH merge v2 ship before 2026?"
                  yes={41} vol="$22.1K" delay="2s"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-y border-[var(--border-subtle)]" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-0">
          {[
            { val: 5, suffix: "%",   label: "Fixed borrow APR",      color: "#818CF8" },
            { val: 2, suffix: "×",   label: "Max yield multiplier",  color: "#10B981" },
            { val: 90, suffix: "+",  label: "Score for elite tier",  color: "#A78BFA" },
            { val: 100, suffix: "%", label: "On-chain & transparent", color: "#38BDF8" },
          ].map(({ val, suffix, label, color }, i) => (
            <div key={label} className={`text-center py-3 px-6 ${i < 3 ? "md:border-r border-[var(--border-subtle)]" : ""}`}>
              <div className="text-3xl font-black tracking-tight mb-1" style={{ color }}>
                <AnimatedCounter target={val} suffix={suffix} />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="mb-14">
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase mb-4" style={{ color: "var(--accent-secondary)" }}>
            Core features
          </div>
          <h2 className="font-black tracking-tight mb-4 leading-tight" style={{ fontSize: "clamp(32px,4vw,52px)" }}>
            Everything you need.<br />Nothing you don't.
          </h2>
          <p className="text-[var(--text-secondary)] leading-relaxed max-w-lg text-base">
            Lendiq combines a prediction market, DeFi lending, and an on-chain reputation layer into one unified protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={f.title}
              className="surface-card p-7 group cursor-default animate-fade-up"
              style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ background: f.glow, color: f.accent, border: `1px solid ${f.accent}25` }}>
                {f.icon}
              </div>
              <div className="text-[15px] font-bold mb-2.5">{f.title}</div>
              <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{f.desc}</div>
              <div className="mt-4 h-px" style={{ background: `linear-gradient(90deg, ${f.accent}30, transparent)` }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="mb-14">
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase mb-4" style={{ color: "var(--accent-secondary)" }}>
            How it works
          </div>
          <h2 className="font-black tracking-tight mb-4" style={{ fontSize: "clamp(32px,4vw,52px)" }}>
            Three steps to smarter DeFi.
          </h2>
          <p className="text-[var(--text-secondary)] leading-relaxed max-w-lg text-base">
            Lendiq rewards accuracy, not just capital. The more you predict correctly, the better your terms.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <div key={s.n}
              className="glass-card p-8 flex gap-6 items-start group animate-fade-up"
              style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-[13px] font-black transition-transform group-hover:scale-105"
                style={{ background: `${s.accent}18`, color: s.accent, border: `1px solid ${s.accent}30` }}>
                {s.n}
              </div>
              <div className="flex-1">
                <div className="text-[16px] font-bold mb-2">{s.title}</div>
                <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{s.desc}</div>
              </div>
              <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                style={{ background: `${s.accent}20`, color: s.accent }}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Score tiers ── */}
      <section id="score-tiers" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="mb-14">
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase mb-4" style={{ color: "var(--accent-secondary)" }}>
            Score tiers
          </div>
          <h2 className="font-black tracking-tight mb-4" style={{ fontSize: "clamp(32px,4vw,52px)" }}>
            Your score, your terms.
          </h2>
          <p className="text-[var(--text-secondary)] leading-relaxed max-w-lg text-base">
            Hit 50 for Standard, 70 for Advanced, and 90+ for Elite — each tier unlocks better multipliers and borrow limits.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TIERS.map((t, i) => (
            <div key={t.name}
              className={`rounded-2xl p-7 text-center transition-all hover:-translate-y-1.5 animate-fade-up ${
                t.featured ? "animate-glow" : "surface-card"
              }`}
              style={t.featured ? {
                background: `linear-gradient(145deg, ${t.accent}18, ${t.accent}08)`,
                border: `1px solid ${t.accent}35`,
                borderRadius: "18px",
                boxShadow: `0 8px 32px ${t.accent}20`,
                animationDelay: `${i * 0.05}s`,
              } : { animationDelay: `${i * 0.05}s` }}>
              <div className="inline-block text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4 border"
                style={{ background: `${t.accent}15`, color: t.accent, borderColor: `${t.accent}30` }}>
                {t.name}
              </div>
              <div className="text-[12px] text-[var(--text-muted)] mb-3">{t.range}</div>
              <div className="text-[36px] font-black tracking-tight mb-0.5" style={{ color: t.featured ? t.accent : "var(--text-primary)" }}>
                {t.mult}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mb-4">Yield multiplier</div>
              <div className="text-[12px] text-[var(--text-secondary)] pt-3 border-t border-[var(--border-subtle)]">{t.ltv}</div>
              {t.featured && (
                <div className="mt-3 text-[10px] font-bold tracking-wider" style={{ color: t.accent }}>✦ Elite bonus pool</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="max-w-2xl mx-auto relative overflow-hidden rounded-3xl p-10 sm:p-16 text-center"
          style={{ background: "linear-gradient(145deg, rgba(99,102,241,0.12), rgba(79,70,229,0.06))", border: "1px solid rgba(99,102,241,0.25)" }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full opacity-30"
              style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.4) 0%, transparent 70%)" }} />
          </div>
          <div className="relative">
            <div className="text-[11px] font-bold tracking-[0.14em] uppercase mb-4" style={{ color: "var(--accent-secondary)" }}>
              Get started
            </div>
            <h2 className="font-black tracking-tight mb-4" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
              Ready to predict<br />
              <span style={{ background: "linear-gradient(135deg, #818CF8, #6366F1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                smarter?
              </span>
            </h2>
            <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-10 max-w-sm mx-auto">
              Get testnet USDC, deposit into the vault, and start building your Lendiq score today. The protocol is live on Arc Testnet.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="btn-primary flex items-center gap-2.5 text-[15px] px-7 py-3.5">
                Launch App
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2.5 text-[15px] px-7 py-3.5">
                Get Testnet USDC
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-subtle)] px-4 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-[var(--text-muted)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Image src="/logo.png" alt="Lendiq" width={18} height={18} className="rounded object-contain" />
          </div>
          <span className="font-black text-sm text-[var(--text-primary)]">Lend<span style={{ color: "var(--accent-secondary)" }}>iq</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span>Built on Arc Network · Chain ID 5042002</span>
          <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors underline underline-offset-2">
            ArcScan ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
