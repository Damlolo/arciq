"use client";

import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc, yieldMultiplierLabel, ltvLabel } from "../lib/contracts";

export function ProfileCard() {
  const {
    address, score, isElite,
    depositBalance, loanCollateral, freeBalance,
    earnedWithMultiplier, totalYieldDistributed,
    loan, accruedInterest, healthFactor,
    usdcBalance,
    estimatedApy, yieldMultiplier,
  } = useProtocol();

  if (!address) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm py-12">
        Connect your wallet to view your profile
      </div>
    );
  }

  const hasLoan = loan && (loan as any).active;
  const effectiveApy = (estimatedApy * yieldMultiplier).toFixed(2);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
          {address.slice(2, 4).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {address.slice(0, 8)}…{address.slice(-6)}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-medium ${
              score >= 90 ? "text-violet-400" :
              score >= 70 ? "text-emerald-400" :
              score >= 50 ? "text-blue-400" : "text-gray-400"
            }`}>
              ArcIQ {score}
            </span>
            {isElite && (
              <span className="text-xs text-violet-400 bg-violet-400/10 border border-violet-400/20 px-1.5 py-0.5 rounded">
                ⚡ Elite
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Wallet</p>
          <p className="text-sm font-semibold text-white">${formatUsdc(usdcBalance)}</p>
        </div>
      </div>

      {/* Yield snapshot */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <p className="text-xs text-emerald-400">Effective APY</p>
          <p className="text-lg font-bold text-emerald-300">{effectiveApy}%</p>
          <p className="text-xs text-emerald-600 mt-0.5">{yieldMultiplierLabel(score)} multiplier</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <p className="text-xs text-blue-400">Max LTV</p>
          <p className="text-lg font-bold text-blue-300">{ltvLabel(score)}</p>
          <p className="text-xs text-blue-600 mt-0.5">score-weighted</p>
        </div>
      </div>

      {/* Vault stats */}
      <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-400 mb-1">Vault position</p>
        <Row label="Deposited" value={`$${formatUsdc(depositBalance)}`} />
        <Row label="Locked as collateral" value={`$${formatUsdc(loanCollateral)}`} dim />
        <Row label="Free to withdraw" value={`$${formatUsdc(freeBalance)}`} highlight />
        <Row label="Claimable yield" value={`$${formatUsdc(earnedWithMultiplier)}`}
          highlight={earnedWithMultiplier > 0n} />
      </div>

      {/* Loan position */}
      {hasLoan && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-400">Active loan</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              healthFactor >= 1.5 ? "text-emerald-400 bg-emerald-400/10" :
              healthFactor >= 1.1 ? "text-amber-400 bg-amber-400/10" :
              "text-red-400 bg-red-400/10"
            }`}>
              HF {healthFactor.toFixed(2)}
            </span>
          </div>
          <Row label="Principal" value={`$${formatUsdc((loan as any).principal)}`} />
          <Row label="Accrued interest" value={`$${formatUsdc(accruedInterest)}`} warn />
          <Row label="Total to repay"
            value={`$${formatUsdc((loan as any).principal + accruedInterest)}`} />
        </div>
      )}

      {/* History */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-gray-500">Protocol totals</p>
        <p className="text-xs text-gray-600">
          All-time yield distributed to depositors: <span className="text-white">${formatUsdc(totalYieldDistributed)}</span>
        </p>
      </div>

      {/* Score progress */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500">Score progress</p>
          <p className="text-xs text-gray-400">
            {score < 50 ? "50 to unlock baseline yield" :
             score < 70 ? `${70 - score} pts to Advanced (1.2×)` :
             score < 80 ? `${80 - score} pts to Pro (1.4×)` :
             score < 90 ? `${90 - score} pts to Elite (1.6× + bonus pool)` :
             "🏆 Maximum tier reached"}
          </p>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              background: score >= 90 ? "#7F77DD" :
                          score >= 70 ? "#1D9E75" :
                          score >= 50 ? "#378ADD" : "#E24B4A",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Row({
  label, value, highlight, warn, dim,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={
        highlight ? "text-emerald-400 font-semibold" :
        warn      ? "text-amber-400 font-semibold" :
        dim       ? "text-gray-500" :
        "text-white font-medium"
      }>{value}</span>
    </div>
  );
}
