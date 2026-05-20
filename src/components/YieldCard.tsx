"use client";

import { useState } from "react";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc, formatCountdown, CONTRACT_ADDRESSES } from "../lib/contracts";

export function YieldCard() {
  const {
    estimatedApy, pendingTotal, eliteBonusPool,
    totalToVault, totalBorrowInterestReceived,
    // v2: renamed from totalLiquidationFeesCollected
    totalLiquidationFeesReceived,
    totalPredictionFeesReceived, totalExternalYieldHarvested,
    totalDeposits, totalBorrowed,
    // v2: seconds until distribute() is callable — 0 = callable now
    secondsUntilDistribution, canDistribute,
    // v2: USYC adapter stats
    hasAdapter, adapterPendingYield, adapterApy, adapterDeployed,
    deployedToSource,
    isElite,
    claimEliteBonus, distributeYield, deployToSource,
  } = useProtocol();

  const [distributing, setDistributing] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [eliteClaiming, setEliteClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const utilisation = totalDeposits > 0n
    ? Math.round((Number(totalBorrowed) / Number(totalDeposits)) * 100)
    : 0;

  // v2: drive countdown from secondsUntilDistribution (live on-chain value)
  const countdownLabel = canDistribute
    ? "Available now"
    : formatCountdown(secondsUntilDistribution);

  async function handleDistribute() {
    setDistributing(true);
    setTxHash(null);
    try {
      const hash = await distributeYield();
      setTxHash(hash);
    } catch (e) {
      console.error(e);
    } finally {
      setDistributing(false);
    }
  }

  async function handleDeploy() {
    setDeploying(true);
    setTxHash(null);
    try {
      const hash = await deployToSource();
      setTxHash(hash);
    } catch (e) {
      console.error(e);
    } finally {
      setDeploying(false);
    }
  }

  async function handleEliteClaim() {
    setEliteClaiming(true);
    setTxHash(null);
    try {
      const hash = await claimEliteBonus();
      setTxHash(hash);
    } catch (e) {
      console.error(e);
    } finally {
      setEliteClaiming(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Yield Engine</h2>

      {/* Revenue stream breakdown — v2: Aave → USYC */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500 mb-1">Revenue streams</p>

        <StreamRow
          label={hasAdapter ? "USYC (T-bill yield)" : "External DeFi yield"}
          desc={
            hasAdapter
              ? `Idle collateral in USYC — ${adapterApy.toFixed(2)}% APY from U.S. T-bills`
              : "Coming soon — awaiting USYC allowlist approval"
          }
          apy={hasAdapter ? `~${adapterApy.toFixed(1)}%` : "—"}
          color="blue"
          live={hasAdapter}
        />
        <StreamRow
          label="Borrow interest"
          desc="5% APR from active loans"
          apy="5% APR"
          color="emerald"
          live
        />
        <StreamRow
          label="Prediction fees"
          desc="1% of every market entry"
          apy="Variable"
          color="amber"
          live
        />
        <StreamRow
          label="Liquidation fees"
          desc="5% penalty from seized collateral"
          apy="Variable"
          color="rose"
          live
        />
      </div>

      {/* USYC adapter live panel — shown only when adapter is deployed */}
      {hasAdapter && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-blue-300 mb-1">USYC Adapter — Live</p>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Deployed" value={`$${formatUsdc(adapterDeployed)}`} />
            <MiniStat label="Pending yield" value={`$${formatUsdc(adapterPendingYield)}`} accent />
            <MiniStat label="T-bill APY" value={`${adapterApy.toFixed(2)}%`} accent />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Yield is harvested on each weekly distribute() call and forwarded to depositors.
          </p>
        </div>
      )}

      {/* Protocol stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Pending yield"           value={`$${formatUsdc(pendingTotal)}`} />
        <StatBox label="All-time to depositors"  value={`$${formatUsdc(totalToVault)}`} />
        <StatBox label="Utilisation"             value={`${utilisation}%`} />
        {/* v2: live countdown instead of computed next-date string */}
        <StatBox
          label="Next distribution"
          value={countdownLabel}
          highlight={canDistribute}
        />
      </div>

      {/* Lifetime breakdown */}
      <div className="rounded-xl bg-gray-800 p-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-300 mb-1">Lifetime revenue breakdown</p>
        <BreakdownRow label="Borrow interest"    value={totalBorrowInterestReceived} color="emerald" />
        {/* v2: was totalLiquidationFeesCollected — now totalLiquidationFeesReceived */}
        <BreakdownRow label="Liquidation fees"   value={totalLiquidationFeesReceived}  color="rose"    />
        <BreakdownRow label="Prediction fees"    value={totalPredictionFeesReceived}   color="amber"   />
        <BreakdownRow label="External (USYC)"    value={totalExternalYieldHarvested}   color="blue"    />
      </div>

      {/* Elite bonus pool */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Elite bonus pool (score ≥ 90)</p>
            <p className="text-lg font-bold text-violet-300">${formatUsdc(eliteBonusPool)}</p>
            <p className="text-xs text-gray-500 mt-0.5">10% of all prediction fees, ring-fenced for elite predictors</p>
          </div>
          {isElite && eliteBonusPool > 0n && (
            <button
              onClick={handleEliteClaim}
              disabled={eliteClaiming}
              className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shrink-0"
            >
              {eliteClaiming ? "…" : "Claim"}
            </button>
          )}
        </div>
      </div>

      {/* Keeper actions */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500">Keeper actions — callable by anyone</p>
        <div className="flex gap-2">
          <button
            onClick={handleDeploy}
            disabled={deploying || !hasAdapter}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 text-xs font-medium py-2 rounded-xl transition-colors border border-gray-700"
            title={!hasAdapter ? "USYC adapter not deployed yet — awaiting allowlist approval" : ""}
          >
            {deploying ? "Deploying…" : hasAdapter ? "Deploy idle USDC →" : "No yield source yet"}
          </button>
          {/* v2: button disabled until secondsUntilDistribution === 0 */}
          <button
            onClick={handleDistribute}
            disabled={distributing || !canDistribute}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 text-xs font-medium py-2 rounded-xl transition-colors border border-gray-700"
            title={!canDistribute ? `Distribution available in ${countdownLabel}` : ""}
          >
            {distributing
              ? "Distributing…"
              : canDistribute
                ? "Distribute yield →"
                : `Distribute (${countdownLabel})`}
          </button>
        </div>
      </div>

      {txHash && (
        <p className="text-xs text-gray-500 break-all">
          Tx:{" "}
          <a
            href={`https://testnet.arcscan.app/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white underline"
          >
            {txHash.slice(0, 20)}…
          </a>
        </p>
      )}

      {/* Yield multiplier tiers */}
      <div className="rounded-xl bg-gray-800 p-4">
        <p className="text-xs font-semibold text-gray-300 mb-2">Yield multiplier tiers</p>
        <div className="flex flex-col gap-1">
          {[
            { range: "Score < 50", mult: "0.8×", note: "Penalty",           color: "text-red-400"    },
            { range: "50 – 69",    mult: "1.0×", note: "Baseline",          color: "text-blue-400"   },
            { range: "70 – 79",    mult: "1.2×", note: "+20%",              color: "text-emerald-400" },
            { range: "80 – 89",    mult: "1.4×", note: "+40%",              color: "text-amber-400"  },
            { range: "≥ 90",       mult: "1.6×", note: "+60% + elite pool", color: "text-violet-400" },
          ].map((row) => (
            <div key={row.range} className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{row.range}</span>
              <span className={`font-bold ${row.color}`}>{row.mult}</span>
              <span className="text-gray-600 w-32 text-right">{row.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StreamRow({
  label, desc, apy, color, live,
}: {
  label: string;
  desc: string;
  apy: string;
  color: "blue" | "emerald" | "amber" | "rose";
  live?: boolean;
}) {
  const dot: Record<string, string> = {
    blue: "bg-blue-400", emerald: "bg-emerald-400",
    amber: "bg-amber-400", rose: "bg-rose-400",
  };
  const text: Record<string, string> = {
    blue: "text-blue-400", emerald: "text-emerald-400",
    amber: "text-amber-400", rose: "text-rose-400",
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
      <div className={`w-2 h-2 rounded-full shrink-0 ${dot[color]} ${live ? "" : "opacity-40"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${live ? "text-white" : "text-gray-500"}`}>{label}</p>
        <p className="text-[10px] text-gray-500 truncate">{desc}</p>
      </div>
      <span className={`text-xs font-bold shrink-0 ${live ? text[color] : "text-gray-600"}`}>{apy}</span>
    </div>
  );
}

function StatBox({
  label, value, highlight,
}: {
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-gray-800"}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? "text-emerald-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-xs font-bold mt-0.5 ${accent ? "text-blue-300" : "text-white"}`}>{value}</p>
    </div>
  );
}

function BreakdownRow({
  label, value, color,
}: {
  label: string; value: bigint; color: "blue" | "emerald" | "amber" | "rose";
}) {
  const text: Record<string, string> = {
    blue: "text-blue-400", emerald: "text-emerald-400",
    amber: "text-amber-400", rose: "text-rose-400",
  };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${text[color]}`}>${formatUsdc(value)}</span>
    </div>
  );
}
