"use client";

import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc, yieldMultiplierLabel, ltvLabel } from "../lib/contracts";

function Row({ label, value, highlight, warn, dim }: {
  label: string; value: string;
  highlight?: boolean; warn?: boolean; dim?: boolean;
}) {
  const color = highlight ? "var(--yes-color)"
    : warn ? "#F59E0B"
    : dim  ? "var(--text-muted)"
    : "var(--text-primary)";
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

function scoreTierColor(score: number) {
  if (score >= 90) return { text: "#A78BFA", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)", label: "Elite"    };
  if (score >= 70) return { text: "#38BDF8", bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.20)",  label: "Advanced" };
  if (score >= 50) return { text: "#818CF8", bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.20)",  label: "Standard" };
  return               { text: "#94A3B8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.18)", label: "Beginner" };
}

function hfColor(hf: number) {
  if (hf >= 1.5) return "var(--yes-color)";
  if (hf >= 1.1) return "#F59E0B";
  return "var(--no-color)";
}

export function ProfileCard() {
  const {
    address, score, isElite,
    depositBalance, loanCollateral, freeBalance,
    earnedWithMultiplier, totalYieldDistributed,
    loan, accruedInterest, healthFactor,
    usdcBalance, estimatedApy, yieldMultiplier,
  } = useProtocol();

  if (!address) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="text-[var(--text-muted)] text-sm">Connect your wallet to view your profile</p>
      </div>
    );
  }

  const hasLoan     = loan && (loan as any).active;
  const effectiveApy = (estimatedApy * yieldMultiplier).toFixed(2);
  const tier        = scoreTierColor(score);

  const nextMilestone =
    score < 50 ? `${50 - score} pts to Standard (1.0×)` :
    score < 70 ? `${70 - score} pts to Advanced (1.2×)` :
    score < 90 ? `${90 - score} pts to Elite (1.6× + bonus pool)` :
    "🏆 Maximum tier reached";

  return (
    <div className="surface-card p-6 flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[13px] font-black shrink-0"
          style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}>
          {address.slice(2, 4).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[var(--text-primary)] truncate font-mono">
            {address.slice(0, 8)}…{address.slice(-6)}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-semibold" style={{ color: tier.text }}>
              ArcIQ {score} · {tier.label}
            </span>
            {isElite && (
              <span className="badge badge-elite text-[10px] px-2 py-0.5">⚡ Elite</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Wallet</p>
          <p className="text-[14px] font-bold text-[var(--text-primary)]">${formatUsdc(usdcBalance)}</p>
        </div>
      </div>

      {/* APY + LTV highlight cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl p-3.5"
          style={{ background: "var(--yes-glow)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--yes-color)" }}>Effective APY</p>
          <p className="text-[20px] font-black" style={{ color: "var(--yes-color)" }}>{effectiveApy}%</p>
          <p className="text-[10px] mt-0.5 text-[var(--text-muted)]">{yieldMultiplierLabel(score)} multiplier</p>
        </div>
        <div className="rounded-xl p-3.5"
          style={{ background: "var(--accent-glow)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--accent-secondary)" }}>Max LTV</p>
          <p className="text-[20px] font-black" style={{ color: "var(--accent-secondary)" }}>{ltvLabel(score)}</p>
          <p className="text-[10px] mt-0.5 text-[var(--text-muted)]">score-weighted</p>
        </div>
      </div>

      {/* Vault position */}
      <div className="rounded-xl p-4 flex flex-col gap-2.5"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-0.5">Vault position</p>
        <Row label="Deposited"           value={`$${formatUsdc(depositBalance)}`} />
        <Row label="Locked as collateral" value={`$${formatUsdc(loanCollateral)}`} dim />
        <Row label="Free to withdraw"    value={`$${formatUsdc(freeBalance)}`} highlight />
        <Row label="Claimable yield"     value={`$${formatUsdc(earnedWithMultiplier)}`}
          highlight={earnedWithMultiplier > 0n} />
      </div>

      {/* Active loan */}
      {hasLoan && (
        <div className="rounded-xl p-4 flex flex-col gap-2.5"
          style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "#F59E0B" }}>Active loan</p>
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full"
              style={{
                color: hfColor(healthFactor),
                background: `${hfColor(healthFactor)}18`,
                border: `1px solid ${hfColor(healthFactor)}30`
              }}>
              HF {healthFactor.toFixed(2)}
            </span>
          </div>
          <Row label="Principal"       value={`$${formatUsdc((loan as any).principal)}`} />
          <Row label="Accrued interest" value={`$${formatUsdc(accruedInterest)}`} warn />
          <Row label="Total to repay"  value={`$${formatUsdc((loan as any).principal + accruedInterest)}`} />
        </div>
      )}

      {/* Protocol total */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[var(--text-muted)]">Protocol yield distributed (all-time)</span>
        <span className="font-bold text-[var(--text-primary)]">${formatUsdc(totalYieldDistributed)}</span>
      </div>

      {/* Score progress bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] mb-2">
          <span className="text-[var(--text-muted)]">Score progress</span>
          <span className="text-[var(--text-secondary)] font-medium">{nextMilestone}</span>
        </div>
        <div className="progress-track h-2">
          <div className="progress-fill h-full"
            style={{
              width: `${score}%`,
              background: score >= 90 ? "linear-gradient(90deg,#A78BFA,#818CF8)"
                : score >= 70 ? "linear-gradient(90deg,#38BDF8,#818CF8)"
                : score >= 50 ? "linear-gradient(90deg,#6366F1,#818CF8)"
                : "linear-gradient(90deg,#F43F5E,#F87171)"
            }}
          />
        </div>
      </div>
    </div>
  );
}
