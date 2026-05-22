"use client";

import { useState, useMemo } from "react";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc } from "../lib/contracts";

// ─── Health factor colour ─────────────────────────────────────────────────────
function hfColor(hf: number) {
  if (hf >= 2)   return { text: "#10B981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)"  };
  if (hf >= 1.5) return { text: "#34D399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.2)"  };
  if (hf >= 1.1) return { text: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)"  };
  if (hf > 0)    return { text: "#F43F5E", bg: "rgba(244,63,94,0.1)",   border: "rgba(244,63,94,0.2)"   };
  return                { text: "var(--text-muted)", bg: "transparent", border: "transparent" };
}

function utilisationColor(pct: number) {
  if (pct <= 60) return "#10B981";
  if (pct <= 85) return "#F59E0B";
  return "#F43F5E";
}

function parseError(e: any): string {
  const raw: string =
    e?.cause?.reason ?? e?.cause?.shortMessage ?? e?.cause?.message ??
    e?.reason ?? e?.shortMessage ?? e?.message ?? "";
  if (raw.toLowerCase().includes("user rejected") || raw.toLowerCase().includes("user denied") || e?.code === 4001)
    return "Transaction cancelled.";
  const m = raw.match(/reverted with reason string '(.+?)'/);
  if (m) return m[1];
  if (e?.shortMessage && e.shortMessage.length < 120) return e.shortMessage;
  return "Transaction failed. Please try again.";
}

// ─── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
      <p className="text-[11px] text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className="text-[14px] font-bold" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

// ─── BorrowPanel ──────────────────────────────────────────────────────────────
export function BorrowPanel() {
  const {
    score, ltvPct, freeBalance, depositBalance, loanCollateral,
    borrow, repay, loan, accruedInterest, healthFactor,
  } = useProtocol();

  const [collateralInput, setCollateralInput] = useState("");
  const [borrowInput, setBorrowInput]         = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");

  const hasLoan = loan && (loan as any).active;

  const preview = useMemo(() => {
    const col = parseFloat(collateralInput) || 0;
    const amt = parseFloat(borrowInput)     || 0;
    const maxBorrow  = col * (ltvPct / 100);
    const utilizePct = maxBorrow > 0 ? (amt / maxBorrow) * 100 : 0;
    const hf         = amt > 0 ? (col * 0.85) / amt : 0;
    return { maxBorrow, utilizePct, hf, col, amt };
  }, [collateralInput, borrowInput, ltvPct]);

  const hfc = hfColor(preview.hf);
  const uc  = utilisationColor(preview.utilizePct);

  async function handleBorrow() {
    setError("");
    if (!collateralInput || !borrowInput)   { setError("Enter collateral and borrow amounts"); return; }
    if (preview.amt > preview.maxBorrow)    { setError(`Exceeds borrow limit of $${preview.maxBorrow.toFixed(2)}`); return; }
    if (preview.hf < 1.1)                  { setError("Health factor too low — risk of immediate liquidation"); return; }
    const freeBal = Number(freeBalance) / 1e6;
    if (preview.col > freeBal)             { setError(`Not enough free balance (have $${freeBal.toFixed(2)})`); return; }

    setLoading(true);
    try {
      await borrow(collateralInput, borrowInput);
      setCollateralInput(""); setBorrowInput("");
    } catch (e: any) { setError(parseError(e)); }
    finally { setLoading(false); }
  }

  async function handleRepay() {
    setLoading(true); setError("");
    try { await repay(); }
    catch (e: any) { setError(parseError(e)); }
    finally { setLoading(false); }
  }

  // ── Active loan view ─────────────────────────────────────────────────────
  if (hasLoan) {
    const loanData    = loan as any;
    const totalRepay  = loanData.principal + accruedInterest;
    const hfActive    = hfColor(healthFactor);
    const hfPct       = Math.min((healthFactor / 2) * 100, 100);

    return (
      <div className="glass-card p-6 flex flex-col gap-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)" }} />

        <div className="relative">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-muted)]">Active Loan</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">5% fixed APR · repay to unlock collateral</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Principal"        value={`$${formatUsdc(loanData.principal)}`} />
          <StatBox label="Interest owed"    value={`$${formatUsdc(accruedInterest)}`} color="#F59E0B" />
          <StatBox label="Collateral locked" value={`$${formatUsdc(loanCollateral)}`} color="var(--text-muted)" />
          {/* Health factor */}
          <div className="rounded-xl p-3.5" style={{ background: "var(--bg-elevated)", border: `1px solid ${hfActive.border}` }}>
            <p className="text-[11px] text-[var(--text-muted)] mb-1">Health factor</p>
            <p className="text-[18px] font-black mb-1.5" style={{ color: hfActive.text }}>{healthFactor.toFixed(2)}</p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${hfPct}%`, background: hfActive.text }} />
            </div>
          </div>
        </div>

        {/* Total repay */}
        <div className="rounded-xl px-4 py-3.5 flex items-center justify-between"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <span className="text-[13px] text-[var(--text-secondary)]">Total to repay now</span>
          <span className="text-[16px] font-black text-[var(--text-primary)]">${formatUsdc(totalRepay)}</span>
        </div>

        {/* Risk warning */}
        {healthFactor < 1.2 && healthFactor > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--no-color)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-[12px]" style={{ color: "var(--no-color)" }}>
              Position approaching liquidation. Repay soon to protect your collateral.
            </p>
          </div>
        )}

        {error && (
          <p className="text-[12px] text-center font-medium" style={{ color: "var(--no-color)" }}>{error}</p>
        )}

        <button
          onClick={handleRepay}
          disabled={loading}
          className="btn-no w-full py-3.5 text-[14px] disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Repaying…
            </span>
          ) : "Repay full loan"}
        </button>
      </div>
    );
  }

  // ── New borrow form ───────────────────────────────────────────────────────
  return (
    <div className="glass-card p-6 flex flex-col gap-5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{ background: "radial-gradient(ellipse at 20% 80%, rgba(56,189,248,0.05) 0%, transparent 60%)" }} />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-muted)]">Borrow Simulator</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">5% fixed APR · liquidation at 85%</p>
        </div>
        <div className="badge badge-blue">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Score {score} · {ltvPct.toFixed(0)}% LTV
        </div>
      </div>

      {/* Collateral input */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[12px]">
          <label className="text-[var(--text-muted)]">Collateral to lock</label>
          <button
            className="font-semibold transition-colors"
            style={{ color: "var(--accent-secondary)" }}
            onClick={() => setCollateralInput((Number(freeBalance) / 1e6).toFixed(2))}
          >
            Max: ${formatUsdc(freeBalance)}
          </button>
        </div>
        <div className="relative">
          <input
            type="number" min="0" step="any"
            value={collateralInput}
            onChange={(e) => setCollateralInput(e.target.value)}
            placeholder="0.00"
            className="premium-input pr-16 font-bold"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[var(--text-muted)]">USDC</span>
        </div>
      </div>

      {/* Borrow input */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[12px]">
          <label className="text-[var(--text-muted)]">Borrow amount</label>
          <button
            className="font-semibold transition-colors"
            style={{ color: "var(--accent-secondary)" }}
            onClick={() => setBorrowInput(preview.maxBorrow.toFixed(2))}
          >
            Max: ${preview.maxBorrow.toFixed(2)}
          </button>
        </div>
        <div className="relative">
          <input
            type="number" min="0" step="any"
            value={borrowInput}
            onChange={(e) => setBorrowInput(e.target.value)}
            placeholder="0.00"
            className="premium-input pr-16 font-bold"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[var(--text-muted)]">USDC</span>
        </div>
      </div>

      {/* Live preview */}
      {(preview.col > 0 || preview.amt > 0) && (
        <div className="rounded-xl p-4 flex flex-col gap-4"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)]">Live preview</p>

          {/* Utilisation bar */}
          <div>
            <div className="flex justify-between text-[12px] mb-2">
              <span className="text-[var(--text-muted)]">Utilisation</span>
              <span className="font-semibold" style={{ color: uc }}>{preview.utilizePct.toFixed(0)}% of limit</span>
            </div>
            <div className="progress-track h-2">
              <div className="progress-fill h-full"
                style={{ width: `${Math.min(preview.utilizePct, 100)}%`, background: uc }} />
            </div>
          </div>

          {/* HF + interest */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: hfc.bg, border: `1px solid ${hfc.border}` }}>
              <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Health factor</p>
              <p className="text-[18px] font-black" style={{ color: hfc.text }}>
                {preview.hf > 0 ? preview.hf.toFixed(2) : "—"}
              </p>
            </div>
            {preview.amt > 0 && (
              <div className="rounded-xl p-3" style={{ background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Annual interest</p>
                <p className="text-[15px] font-bold text-[var(--text-primary)]">${(preview.amt * 0.05).toFixed(2)}/yr</p>
              </div>
            )}
          </div>

          {/* Risk callout */}
          {preview.hf > 0 && preview.hf < 1.1 && (
            <div className="rounded-xl px-3 py-2.5 text-[12px] flex items-start gap-2"
              style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "var(--no-color)" }}>
              <span>⚠</span>
              Health factor below 1.1 — immediately liquidatable. Increase collateral or reduce borrow.
            </div>
          )}
          {preview.hf >= 1.1 && preview.hf < 1.5 && (
            <div className="rounded-xl px-3 py-2.5 text-[12px] flex items-start gap-2"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
              <span>⚡</span>
              Moderate risk — interest accrual will reduce health factor over time.
            </div>
          )}
          {preview.hf >= 1.5 && (
            <div className="rounded-xl px-3 py-2.5 text-[12px] flex items-start gap-2"
              style={{ background: "var(--yes-glow)", border: "1px solid rgba(16,185,129,0.2)", color: "var(--yes-color)" }}>
              <span>✓</span>
              Safe position — comfortably above liquidation threshold.
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "var(--no-color)" }}>
          {error}
        </div>
      )}

      <button
        onClick={handleBorrow}
        disabled={loading || !collateralInput || !borrowInput}
        className="btn-primary w-full py-3.5 text-[14px] disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Confirming…
          </span>
        ) : "Borrow USDC"}
      </button>

      <p className="text-[11px] text-[var(--text-muted)] text-center">
        Interest flows directly to vault depositors — including you.
      </p>
    </div>
  );
}
