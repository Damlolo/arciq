"use client";

import { useState, useMemo } from "react";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc } from "../lib/contracts";

export function BorrowPanel() {
  const { score, ltvPct, freeBalance, depositBalance, loanCollateral, borrow, repay, loan, accruedInterest, healthFactor } = useProtocol();

  const [collateralInput, setCollateralInput] = useState("");
  const [borrowInput, setBorrowInput]         = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");

  const hasLoan = loan && (loan as any).active;

  // Live preview calculations
  const preview = useMemo(() => {
    const col = parseFloat(collateralInput) || 0;
    const amt = parseFloat(borrowInput)     || 0;
    const maxBorrow  = col * (ltvPct / 100);
    const utilizePct = maxBorrow > 0 ? (amt / maxBorrow) * 100 : 0;
    const hf = amt > 0 ? (col * 0.85) / amt : 0;
    return { maxBorrow, utilizePct, hf, col, amt };
  }, [collateralInput, borrowInput, ltvPct]);

  const hfColor =
    preview.hf >= 2   ? "text-emerald-400" :
    preview.hf >= 1.5 ? "text-green-400"   :
    preview.hf >= 1.1 ? "text-amber-400"   :
    preview.hf > 0    ? "text-red-400"     : "text-gray-500";

  const utilizationColor =
    preview.utilizePct <= 60 ? "#1D9E75" :
    preview.utilizePct <= 85 ? "#BA7517" : "#D85A30";

  function parseError(e: any): string {
    console.error("Borrow error full:", e);

    const raw: string =
      e?.cause?.reason ??
      e?.cause?.shortMessage ??
      e?.cause?.message ??
      e?.reason ??
      e?.shortMessage ??
      e?.message ??
      "";

    // User cancelled in wallet
    if (
      raw.toLowerCase().includes("user rejected") ||
      raw.toLowerCase().includes("user denied") ||
      raw.toLowerCase().includes("rejected the request") ||
      e?.code === 4001
    ) {
      return "Transaction cancelled.";
    }

    // Contract revert with a reason string
    const revertMatch = raw.match(/reverted with reason string '(.+?)'/);
    if (revertMatch) return revertMatch[1];

    // viem shortMessage is usually clean enough
    if (e?.shortMessage && e.shortMessage.length < 120) return e.shortMessage;

    // Never show raw calldata
    return "Transaction failed. Please try again.";
  }

  async function handleBorrow() {
    setError("");
    if (!collateralInput || !borrowInput) { setError("Enter collateral and borrow amounts"); return; }
    if (preview.amt > preview.maxBorrow)  { setError(`Exceeds borrow limit of $${preview.maxBorrow.toFixed(2)}`); return; }
    if (preview.hf < 1.1)                { setError("Health factor too low — risk of immediate liquidation"); return; }
    const freeBal = Number(freeBalance) / 1e6;
    if (preview.col > freeBal)            { setError(`Not enough free balance (have $${freeBal.toFixed(2)})`); return; }

    setLoading(true);
    try {
      await borrow(collateralInput, borrowInput);
      setCollateralInput("");
      setBorrowInput("");
    } catch (e: any) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleRepay() {
    setLoading(true);
    setError("");
    try {
      await repay();
    } catch (e: any) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Borrow simulator</h2>
        <span className="text-xs text-gray-500">5% APR · liquidation at 85%</span>
      </div>

      {!hasLoan ? (
        <>
          {/* Score info */}
          <div className="bg-gray-800 rounded-xl p-3 text-xs flex items-center justify-between">
            <span className="text-gray-400">Your max LTV based on score {score}</span>
            <span className="text-white font-semibold">{ltvPct.toFixed(0)}%</span>
          </div>

          {/* Collateral input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <label className="text-gray-500">Collateral to lock</label>
              <button
                className="text-blue-400 hover:text-blue-300"
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
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">USDC</span>
            </div>
          </div>

          {/* Borrow input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <label className="text-gray-500">Borrow amount</label>
              <button
                className="text-blue-400 hover:text-blue-300"
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
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">USDC</span>
            </div>
          </div>

          {/* Live preview */}
          {(preview.col > 0 || preview.amt > 0) && (
            <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400">Live preview</p>

              {/* Utilisation bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Utilisation</span>
                  <span className="font-medium" style={{ color: utilizationColor }}>
                    {preview.utilizePct.toFixed(0)}% of limit
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(preview.utilizePct, 100)}%`,
                      background: utilizationColor,
                    }}
                  />
                </div>
              </div>

              {/* Health factor */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Health factor</span>
                <span className={`font-bold text-sm ${hfColor}`}>
                  {preview.hf > 0 ? preview.hf.toFixed(2) : "—"}
                </span>
              </div>

              {/* APR cost estimate */}
              {preview.amt > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Annual interest (5% APR)</span>
                  <span className="text-white font-medium">${(preview.amt * 0.05).toFixed(2)}/yr</span>
                </div>
              )}

              {/* Risk warnings */}
              {preview.hf > 0 && preview.hf < 1.1 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-400">
                  ⚠️ Health factor below 1.1 — position would be immediately liquidatable
                </div>
              )}
              {preview.hf >= 1.1 && preview.hf < 1.5 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-xs text-amber-400">
                  ⚡ Moderate risk — interest accrual will reduce health factor over time
                </div>
              )}
              {preview.hf >= 1.5 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-xs text-emerald-400">
                  ✓ Safe position — comfortably above liquidation threshold
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleBorrow}
            disabled={loading || !collateralInput || !borrowInput}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Confirming…" : "Borrow USDC"}
          </button>

          <p className="text-xs text-gray-600 text-center">
            Interest goes directly to vault depositors — including you.
          </p>
        </>
      ) : (
        /* Active loan view */
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Principal" value={`$${formatUsdc((loan as any).principal)}`} />
            <StatBox label="Interest owed" value={`$${formatUsdc(accruedInterest)}`} warn />
            <StatBox label="Collateral locked" value={`$${formatUsdc(loanCollateral)}`} />
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500">Health factor</p>
              <p className={`text-sm font-bold mt-0.5 ${
                healthFactor >= 1.5 ? "text-emerald-400" :
                healthFactor >= 1.1 ? "text-amber-400" : "text-red-400"
              }`}>
                {healthFactor.toFixed(2)}
              </p>
              <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((healthFactor / 2) * 100, 100)}%`,
                    background: healthFactor >= 1.5 ? "#1D9E75" : healthFactor >= 1.1 ? "#BA7517" : "#D85A30",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-3 text-xs flex justify-between">
            <span className="text-gray-500">Total to repay now</span>
            <span className="text-white font-semibold">
              ${formatUsdc((loan as any).principal + accruedInterest)}
            </span>
          </div>

          {healthFactor < 1.2 && healthFactor > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
              ⚠️ Your position is approaching liquidation. Repay soon to protect your collateral.
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleRepay}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Repaying…" : "Repay full loan"}
          </button>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${warn ? "text-amber-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
