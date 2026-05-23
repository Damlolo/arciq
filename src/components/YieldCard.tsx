"use client";

import { useState } from "react";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc, formatCountdown } from "../lib/contracts";

// ─── Colour maps keyed to stream type ────────────────────────────────────────
const STREAM_COLORS = {
  blue:    { dot: "#38BDF8", text: "#38BDF8", bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.20)"  },
  emerald: { dot: "#10B981", text: "#10B981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.20)"  },
  amber:   { dot: "#F59E0B", text: "#F59E0B", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.20)"  },
  rose:    { dot: "#FB7185", text: "#FB7185", bg: "rgba(251,113,133,0.10)", border: "rgba(251,113,133,0.20)" },
  violet:  { dot: "#A78BFA", text: "#A78BFA", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.20)" },
} as const;
type StreamColor = keyof typeof STREAM_COLORS;

// ─── Sub-components ───────────────────────────────────────────────────────────
function StreamRow({ label, desc, apy, color, live }: {
  label: string; desc: string; apy: string;
  color: StreamColor; live?: boolean;
}) {
  const c = STREAM_COLORS[color];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="w-2 h-2 rounded-full shrink-0"
        style={{ background: c.dot, opacity: live ? 1 : 0.35,
          boxShadow: live ? `0 0 6px ${c.dot}60` : "none",
          animation: live ? "pulse-dot 2s ease-in-out infinite" : "none" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold truncate"
          style={{ color: live ? "var(--text-primary)" : "var(--text-muted)" }}>{label}</p>
        <p className="text-[10px] text-[var(--text-muted)] truncate">{desc}</p>
      </div>
      <span className="text-[12px] font-bold shrink-0"
        style={{ color: live ? c.text : "var(--text-muted)" }}>{apy}</span>
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl p-3.5"
      style={highlight
        ? { background: "var(--yes-glow)", border: "1px solid rgba(16,185,129,0.2)" }
        : { background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p className="text-[14px] font-bold mt-0.5"
        style={{ color: highlight ? "var(--yes-color)" : "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
      <p className="text-[12px] font-bold mt-0.5" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: bigint; color: StreamColor }) {
  const c = STREAM_COLORS[color];
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-semibold" style={{ color: c.text }}>${formatUsdc(value)}</span>
    </div>
  );
}

// ─── Main YieldCard ───────────────────────────────────────────────────────────
export function YieldCard() {
  const {
    estimatedApy, pendingTotal, eliteBonusPool,
    totalToVault, totalBorrowInterestReceived,
    totalLiquidationFeesReceived, totalPredictionFeesReceived,
    totalExternalYieldHarvested, totalDeposits, totalBorrowed,
    secondsUntilDistribution, canDistribute,
    hasAdapter, adapterPendingYield, adapterApy, adapterDeployed,
    isElite,
    claimEliteBonus, distributeYield, deployToSource,
  } = useProtocol();

  const [distributing,  setDistributing]  = useState(false);
  const [deploying,     setDeploying]     = useState(false);
  const [eliteClaiming, setEliteClaiming] = useState(false);
  const [txHash,        setTxHash]        = useState<string | null>(null);

  const utilisation    = totalDeposits > 0n
    ? Math.round((Number(totalBorrowed) / Number(totalDeposits)) * 100) : 0;
  const countdownLabel = canDistribute ? "Available now" : formatCountdown(secondsUntilDistribution);

  async function run(fn: () => Promise<string | undefined>, setter: (v: boolean) => void) {
    setter(true); setTxHash(null);
    try { const h = await fn(); if (h) setTxHash(h); }
    catch (e) { console.error(e); }
    finally { setter(false); }
  }

  const TIERS = [
    { range: "Score < 50", mult: "0.8×", note: "Penalty",            color: "var(--no-color)"        },
    { range: "50 – 69",    mult: "1.0×", note: "Baseline",           color: "var(--accent-secondary)" },
    { range: "70 – 79",    mult: "1.2×", note: "+20%",               color: "#38BDF8"                 },
    { range: "80 – 89",    mult: "1.4×", note: "+40%",               color: "#F59E0B"                 },
    { range: "≥ 90",       mult: "1.6×", note: "+60% + elite pool",  color: "#A78BFA"                 },
  ];

  return (
    <div className="surface-card p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Yield Engine</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Protocol revenue streams</p>
        </div>
        <span className="badge badge-green">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
          Live
        </span>
      </div>

      {/* Revenue streams */}
      <div className="rounded-xl p-4"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">Revenue streams</p>
        <StreamRow
          label={hasAdapter ? "USYC (T-bill yield)" : "External DeFi yield"}
          desc={hasAdapter
            ? `Idle collateral in USYC — ${adapterApy.toFixed(2)}% APY from U.S. T-bills`
            : "Coming soon — awaiting USYC allowlist approval"}
          apy={hasAdapter ? `~${adapterApy.toFixed(1)}%` : "—"}
          color="blue" live={hasAdapter}
        />
        <StreamRow label="Borrow interest"   desc="5% APR from active loans"          apy="5% APR"   color="emerald" live />
        <StreamRow label="Prediction fees"   desc="1% of every market entry"          apy="Variable" color="amber"   live />
        <StreamRow label="Liquidation fees"  desc="5% penalty from seized collateral" apy="Variable" color="rose"    live />
      </div>

      {/* USYC adapter panel */}
      {hasAdapter && (
        <div className="rounded-xl p-4"
          style={{ background: STREAM_COLORS.blue.bg, border: `1px solid ${STREAM_COLORS.blue.border}` }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: STREAM_COLORS.blue.text }}>
            USYC Adapter — Live
          </p>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Deployed"      value={`$${formatUsdc(adapterDeployed)}`} />
            <MiniStat label="Pending yield" value={`$${formatUsdc(adapterPendingYield)}`} color={STREAM_COLORS.blue.text} />
            <MiniStat label="T-bill APY"    value={`${adapterApy.toFixed(2)}%`}           color={STREAM_COLORS.blue.text} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-3">
            Yield is harvested on each weekly distribute() call and forwarded to depositors.
          </p>
        </div>
      )}

      {/* Protocol stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatBox label="Pending yield"          value={`$${formatUsdc(pendingTotal)}`} />
        <StatBox label="All-time to depositors" value={`$${formatUsdc(totalToVault)}`} />
        <StatBox label="Utilisation"            value={`${utilisation}%`} />
        <StatBox label="Next distribution"      value={countdownLabel} highlight={canDistribute} />
      </div>

      {/* Lifetime breakdown */}
      <div className="rounded-xl p-4 flex flex-col gap-2.5"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-0.5">
          Lifetime revenue breakdown
        </p>
        <BreakdownRow label="Borrow interest"   value={totalBorrowInterestReceived}   color="emerald" />
        <BreakdownRow label="Liquidation fees"  value={totalLiquidationFeesReceived}  color="rose"    />
        <BreakdownRow label="Prediction fees"   value={totalPredictionFeesReceived}   color="amber"   />
        <BreakdownRow label="External (USYC)"   value={totalExternalYieldHarvested}   color="blue"    />
      </div>

      {/* Elite bonus pool */}
      <div className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: STREAM_COLORS.violet.bg, border: `1px solid ${STREAM_COLORS.violet.border}` }}>
        <div>
          <p className="text-[11px] text-[var(--text-muted)] mb-1">Elite bonus pool (score ≥ 90)</p>
          <p className="text-[22px] font-black" style={{ color: STREAM_COLORS.violet.text }}>
            ${formatUsdc(eliteBonusPool)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            10% of all prediction fees, ring-fenced for elite predictors
          </p>
        </div>
        {isElite && eliteBonusPool > 0n && (
          <button
            onClick={() => run(claimEliteBonus, setEliteClaiming)}
            disabled={eliteClaiming}
            className="btn-primary text-[12px] px-4 py-2.5 disabled:opacity-40 shrink-0 ml-4"
            style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
          >
            {eliteClaiming ? "…" : "Claim"}
          </button>
        )}
      </div>

      {/* Keeper actions */}
      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Keeper actions — callable by anyone
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => run(deployToSource as any, setDeploying)}
            disabled={deploying || !hasAdapter}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              borderColor: "var(--border-default)"
            }}
            title={!hasAdapter ? "USYC adapter not deployed yet" : ""}
          >
            {deploying ? "Deploying…" : hasAdapter ? "Deploy idle USDC →" : "No yield source yet"}
          </button>
          <button
            onClick={() => run(distributeYield as any, setDistributing)}
            disabled={distributing || !canDistribute}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canDistribute ? "var(--yes-glow)" : "var(--bg-elevated)",
              color: canDistribute ? "var(--yes-color)" : "var(--text-secondary)",
              borderColor: canDistribute ? "rgba(16,185,129,0.25)" : "var(--border-default)"
            }}
            title={!canDistribute ? `Distribution available in ${countdownLabel}` : ""}
          >
            {distributing ? "Distributing…"
              : canDistribute ? "Distribute yield →"
              : `Distribute (${countdownLabel})`}
          </button>
        </div>
      </div>

      {/* TX link */}
      {txHash && (
        <div className="rounded-xl px-3 py-2.5 text-[11px]"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <span className="text-[var(--text-muted)]">Transaction: </span>
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2" style={{ color: "var(--accent-secondary)" }}>
            {txHash.slice(0, 22)}…
          </a>
        </div>
      )}

      {/* Multiplier tier table */}
      <div className="rounded-xl p-4"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">
          Yield multiplier tiers
        </p>
        <div className="flex flex-col gap-2">
          {TIERS.map(row => (
            <div key={row.range} className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-muted)] w-20">{row.range}</span>
              <span className="font-black" style={{ color: row.color }}>{row.mult}</span>
              <span className="text-[var(--text-muted)] text-right">{row.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
