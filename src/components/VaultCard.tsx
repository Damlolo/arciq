"use client";

import { useState } from "react";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc } from "../lib/contracts";

type Tab = "deposit" | "withdraw";

export function VaultCard() {
  const {
    depositBalance, freeBalance, loanCollateral,
    earnedWithMultiplier, earnedBase,
    usdcBalance,
    estimatedApy, yieldMultiplier, pendingUsdcToVault,
    deposit, withdraw, claimYield,
  } = useProtocol();

  const [tab, setTab]       = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  // Pool APY from completed epoch data + external yield source only.
  // Multiplier is shown separately — it applies at claim time, not to the pool rate.
  const effectiveApy = estimatedApy.toFixed(2);
  const pendingEpochUsdc = Number(pendingUsdcToVault) / 1e6;
  const hasYield     = earnedWithMultiplier > 0n;
  const hasBoost     = yieldMultiplier > 1 && earnedBase > 0n;
  const boostAmount  = hasBoost ? earnedWithMultiplier - earnedBase : 0n;

  const maxDeposit  = Number(usdcBalance) / 1e6;
  const maxWithdraw = Number(freeBalance) / 1e6;

  async function handleAction() {
    if (!amount || isNaN(Number(amount))) return;
    setLoading(true);
    setTxHash(null);
    setError(null);
    try {
      const hash = tab === "deposit" ? await deposit(amount) : await withdraw(amount);
      setTxHash(hash);
      setAmount("");
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Transaction failed");
    }
    finally { setLoading(false); }
  }

  async function handleClaim() {
    setLoading(true);
    try { await claimYield(); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const utilizePct = Number(depositBalance) > 0
    ? (Number(loanCollateral) / Number(depositBalance)) * 100
    : 0;

  return (
    <div className="glass-card p-6 flex flex-col gap-5 relative overflow-hidden">
      {/* bg glow */}
      <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(16,185,129,0.07) 0%, transparent 60%)" }} />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-muted)]">Vault</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Deposit, earn & manage collateral</p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="badge badge-green">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            {effectiveApy}% APY
          </span>
          {pendingEpochUsdc > 0 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              ~${pendingEpochUsdc.toFixed(2)} accruing this epoch
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Deposited", val: `$${formatUsdc(depositBalance)}`, color: "var(--text-primary)" },
          { label: "Free Balance",    val: `$${formatUsdc(freeBalance)}`,    color: "var(--yes-color)" },
          { label: "Locked",          val: `$${formatUsdc(loanCollateral)}`, color: "var(--text-muted)" },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-3.5 flex flex-col gap-1"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
            <span className="text-[14px] font-bold" style={{ color }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Utilisation bar */}
      {Number(depositBalance) > 0 && (
        <div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-[var(--text-muted)]">Collateral utilisation</span>
            <span className="font-semibold text-[var(--text-secondary)]">{utilizePct.toFixed(0)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill"
              style={{
                width: `${Math.min(utilizePct, 100)}%`,
                background: utilizePct > 80
                  ? "linear-gradient(90deg, #F59E0B, #EF4444)"
                  : utilizePct > 50
                  ? "linear-gradient(90deg, #818CF8, #38BDF8)"
                  : "linear-gradient(90deg, var(--yes-color), #34D399)"
              }} />
          </div>
        </div>
      )}

      {/* Yield claim strip */}
      {hasYield && (
        <div className="rounded-xl px-4 py-3.5 flex items-center justify-between"
          style={{ background: "var(--yes-glow)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div>
            <p className="text-[11px] text-[var(--text-muted)] mb-0.5">Claimable yield</p>
            <p className="text-xl font-black" style={{ color: "var(--yes-color)" }}>
              ${formatUsdc(earnedWithMultiplier)}
            </p>
            {hasBoost && (
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                ${formatUsdc(earnedBase)} base
                <span style={{ color: "var(--yes-color)" }}> + ${formatUsdc(boostAmount)} score boost</span>
              </p>
            )}
          </div>
          <button
            onClick={handleClaim}
            disabled={loading}
            className="btn-yes text-[13px] px-5 py-2.5 disabled:opacity-50"
          >
            {loading ? "…" : "Claim"}
          </button>
        </div>
      )}

      {/* Multiplier info */}
      <div className="flex items-center gap-2 text-[12px]">
        <svg className="w-3.5 h-3.5 text-[var(--accent-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <span className="text-[var(--text-muted)]">Yield multiplier:</span>
        <span className="font-bold text-[var(--accent-secondary)]">{yieldMultiplier.toFixed(1)}×</span>
        <span className="text-[var(--text-muted)]">· predict accurately to earn more</span>
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border-subtle)]" />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
        {(["deposit", "withdraw"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-[13px] font-semibold capitalize transition-all"
            style={tab === t ? {
              background: "linear-gradient(135deg, #6366F1, #4F46E5)",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(99,102,241,0.35)"
            } : {
              color: "var(--text-muted)"
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[var(--text-muted)]">
            {tab === "deposit" ? "Wallet balance" : "Available to withdraw"}
          </span>
          <button
            className="font-semibold transition-colors"
            style={{ color: "var(--accent-secondary)" }}
            onClick={() => setAmount(tab === "deposit" ? maxDeposit.toFixed(2) : maxWithdraw.toFixed(2))}
          >
            Max: ${tab === "deposit" ? maxDeposit.toFixed(2) : maxWithdraw.toFixed(2)}
          </button>
        </div>

        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="premium-input pr-16 text-[15px] font-bold"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[var(--text-muted)]">
            USDC
          </span>
        </div>

        <button
          onClick={handleAction}
          disabled={loading || !amount}
          className="btn-primary w-full py-3 text-[14px] capitalize disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Confirming…
            </span>
          ) : tab}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-3 py-2.5 text-[12px]"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* TX hash */}
      {txHash && (
        <div className="rounded-xl px-3 py-2.5 text-[11px]"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <span className="text-[var(--text-muted)]">Transaction: </span>
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors"
            style={{ color: "var(--accent-secondary)" }}>
            {txHash.slice(0, 22)}…
          </a>
        </div>
      )}
    </div>
  );
}
