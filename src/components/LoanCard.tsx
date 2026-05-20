"use client";

import { useState } from "react";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc, healthColor } from "../lib/contracts";

export function LoanCard() {
  const {
    loan, accruedInterest, healthFactor,
    freeBalance, depositBalance,
    loanCollateral,
    ltvPct, score,
    borrow, repay,
  } = useProtocol();

  const [collateral, setCollateral] = useState("");
  const [borrowAmt, setBorrowAmt] = useState("");
  const [loading, setLoading] = useState(false);

  const hasActiveLoan = loan && (loan as any).active;

  const maxBorrow = collateral
    ? ((Number(collateral) * ltvPct) / 100).toFixed(2)
    : "0.00";

  async function handleBorrow() {
    if (!collateral || !borrowAmt) return;
    setLoading(true);
    try {
      await borrow(collateral, borrowAmt);
      setCollateral("");
      setBorrowAmt("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRepay() {
    setLoading(true);
    try {
      await repay();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const hfDisplay = healthFactor === 0 ? "—" : healthFactor.toFixed(2);
  const hfColor = healthFactor === 0 ? "text-gray-400" : healthColor(healthFactor);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Lending</h2>
        <span className="text-xs text-gray-500">5% APR · simple interest</span>
      </div>

      {/* Active loan */}
      {hasActiveLoan ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Principal" value={`$${formatUsdc((loan as any).principal)}`} />
            <StatBox label="Accrued interest" value={`$${formatUsdc(accruedInterest)}`} warn />
            <StatBox label="Collateral locked" value={`$${formatUsdc(loanCollateral)}`} />
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500">Health factor</p>
              <p className={`text-sm font-bold mt-0.5 ${hfColor}`}>{hfDisplay}</p>
              <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    healthFactor >= 1.5 ? "bg-green-500" :
                    healthFactor >= 1.1 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min((healthFactor / 2) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400">
            Total to repay:{" "}
            <span className="text-white font-semibold">
              ${formatUsdc((loan as any).principal + accruedInterest)} USDC
            </span>
            {" "}(principal + interest)
          </div>

          <button
            onClick={handleRepay}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Repaying…" : "Repay loan"}
          </button>

          {healthFactor < 1.1 && healthFactor > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
              ⚠️ Your position is near liquidation. Repay to restore health.
            </div>
          )}
        </div>
      ) : (
        /* New borrow form */
        <div className="flex flex-col gap-3">
          <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400 flex items-center justify-between">
            <span>Your max LTV: <span className="text-white font-semibold">{ltvPct.toFixed(0)}%</span></span>
            <span>Score {score} → {ltvPct.toFixed(0)}% collateral</span>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Collateral to lock</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={collateral}
                onChange={(e) => setCollateral(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">USDC</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Free balance: ${formatUsdc(freeBalance)}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Borrow amount</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={borrowAmt}
                onChange={(e) => setBorrowAmt(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">USDC</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Max borrow: ${maxBorrow} USDC{" "}
              <button
                onClick={() => setBorrowAmt(maxBorrow)}
                className="text-blue-400 hover:text-blue-300"
              >
                (use max)
              </button>
            </p>
          </div>

          <button
            onClick={handleBorrow}
            disabled={loading || !collateral || !borrowAmt}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Confirming…" : "Borrow USDC"}
          </button>

          <p className="text-xs text-gray-600 text-center">
            Interest routes to vault depositors. Predict better → borrow more.
          </p>
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
