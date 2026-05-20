"use client";

import { useState } from "react";
import { useReadContract, useAccount } from "wagmi";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc, parseUsdc } from "../lib/contracts";
import { CONTRACT_ADDRESSES, PREDICTION_MARKET_ABI } from "../lib/contracts";

const MARKET_ADDR = CONTRACT_ADDRESSES.predictionMarket as `0x${string}`;

interface Market {
  question: string;
  endTime: bigint;
  resolved: boolean;
  outcome: boolean;
  yesPool: bigint;
  noPool: bigint;
  feePool: bigint;
}

interface Position {
  yesStake: bigint;
  noStake: bigint;
  claimed: boolean;
}

function useMarketData(id: bigint) {
  return useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket",
    args: [id],
  });
}

// ── Price-per-share model ────────────────────────────────────────────────────
// In this AMM, price = pool_side / total_pool (the implied probability).
// Shares bought = stake / price_per_share.
// Payout if win = stake / price_per_share  (each share pays $1 USDC on win).
// Potential profit = payout - stake.
// Return multiple = 1 / price  (e.g. 0.30 price → 3.33×)

function calcShares(stake: bigint, pool: bigint, total: bigint): number {
  if (total === 0n || pool === 0n) return 0;
  // price = pool / total  →  shares = stake * total / pool
  return Number(stake * total / pool) / 1e6;
}

function calcPricePerShare(pool: bigint, total: bigint): number {
  if (total === 0n) return 0.5;
  return Number(pool) / Number(total);
}

function calcPotentialPayout(stake: bigint, pool: bigint, total: bigint): number {
  if (total === 0n || pool === 0n) return 0;
  return Number(stake * total / pool) / 1e6;
}

// ── Single Market Card ───────────────────────────────────────────────────────

function MarketCard({
  id,
  predict,
  walletAddress,
}: {
  id: bigint;
  predict: (id: bigint, yes: boolean, stake: string) => Promise<void>;
  walletAddress?: `0x${string}`;
}) {
  const { data: m } = useMarketData(id);
  const { data: posRaw } = useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getPosition",
    args: [id, walletAddress!],
    query: { enabled: !!walletAddress },
  });
  const { data: payoutRaw } = useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "previewWinnings",
    args: [id, walletAddress!],
    query: { enabled: !!walletAddress },
  });

  const [tab, setTab] = useState<"yes" | "no">("yes");
  const [stakeInput, setStakeInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txDone, setTxDone] = useState(false);

  if (!m) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl animate-pulse h-52" />
    );
  }

  const market = m as unknown as Market;
  const pos = posRaw as unknown as Position | undefined;
  const payout = (payoutRaw ?? 0n) as bigint;

  const total = market.yesPool + market.noPool;
  const yesPct = total > 0n ? Number(market.yesPool * 10000n / total) / 100 : 50;
  const noPct  = 100 - yesPct;

  const yesPricePerShare = calcPricePerShare(market.yesPool, total);
  const noPricePerShare  = calcPricePerShare(market.noPool, total);

  const ended    = Date.now() > Number(market.endTime) * 1000;
  const isActive = !market.resolved && !ended;
  const timeLeft = ended ? "Ended" : formatTimeLeft(Number(market.endTime));

  // User position details
  const hasYesPos = pos && pos.yesStake > 0n;
  const hasNoPos  = pos && pos.noStake  > 0n;
  const hasPos    = hasYesPos || hasNoPos;

  const userStake  = hasYesPos ? pos!.yesStake  : hasNoPos ? pos!.noStake  : 0n;
  const userPool   = hasYesPos ? market.yesPool : hasNoPos ? market.noPool : 0n;
  const userSide   = hasYesPos ? "YES" : "NO";
  const userShares = hasPos ? calcShares(userStake, userPool, total) : 0;
  const userPricePaid = hasPos ? calcPricePerShare(userPool, total) : 0;
  const userPotentialPayout = hasPos ? calcPotentialPayout(userStake, userPool, total) : 0;
  const userProfit = userPotentialPayout - (hasPos ? Number(userStake) / 1e6 : 0);

  // Preview for stake input
  const stakeNum    = parseFloat(stakeInput) || 0;
  const activePool  = tab === "yes" ? market.yesPool : market.noPool;
  const activePps   = tab === "yes" ? yesPricePerShare : noPricePerShare;
  const previewShares = stakeNum > 0 && total > 0
    ? stakeNum / activePps
    : 0;
  const previewPayout = previewShares;
  const previewProfit = previewPayout - stakeNum;
  const previewMultiple = activePps > 0 ? (1 / activePps).toFixed(2) : "—";

  async function handlePredict() {
    setError("");
    if (!stakeInput || isNaN(Number(stakeInput)) || Number(stakeInput) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      await predict(id, tab === "yes", stakeInput);
      setStakeInput("");
      setTxDone(true);
      setExpanded(false);
      setTimeout(() => setTxDone(false), 4000);
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  const statusPill = market.resolved
    ? { label: market.outcome ? "✓ YES won" : "✗ NO won", cls: "bg-gray-700 text-gray-300" }
    : ended
    ? { label: "⏳ Pending", cls: "bg-amber-400/15 text-amber-400" }
    : { label: `🟢 ${timeLeft}`, cls: "bg-emerald-400/10 text-emerald-400" };

  return (
    <div className="relative">
      {/* ── Fixed-size card ── */}
      <div className={`flex flex-col bg-gray-900 border rounded-2xl overflow-hidden transition-colors duration-200 h-[19rem] ${
        expanded ? "border-gray-600 shadow-xl shadow-black/50" : "border-gray-800 hover:border-gray-700"
      }`}>
        {/* Top accent bar */}
        <div className={`h-0.5 shrink-0 ${
          market.resolved ? "bg-gray-700"
          : ended ? "bg-amber-400/60"
          : "bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500"
        }`} />

        <div className="p-4 flex flex-col gap-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusPill.cls}`}>
              {statusPill.label}
            </span>
            <span className="text-[10px] text-gray-700">#{id.toString()}</span>
          </div>

          {/* Question – always 2 lines worth of space */}
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2 min-h-[2.5rem] shrink-0">
            {market.question}
          </p>

          {/* YES / NO probability bars */}
          <div className="flex gap-2 shrink-0">
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-emerald-400">YES</span>
                <span className="text-sm font-bold text-white">{yesPct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${yesPct}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">{(yesPricePerShare * 100).toFixed(1)}¢/share</span>
            </div>
            <div className="w-px bg-gray-800" />
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-red-400">NO</span>
                <span className="text-sm font-bold text-white">{noPct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${noPct}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">{(noPricePerShare * 100).toFixed(1)}¢/share</span>
            </div>
          </div>

          {/* Pool volume */}
          <div className="flex justify-between text-[10px] text-gray-600 pt-0.5 border-t border-gray-800/60 shrink-0">
            <span>Vol ${formatUsdc(total)}</span>
            <span>Fees ${formatUsdc(market.feePool)}</span>
          </div>

          {/* ── User position pill (compact, always same height) ── */}
          <div className="shrink-0 h-8 flex items-center">
            {hasPos ? (
              <div className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1 ${
                userSide === "YES" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
              }`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Position</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold ${userSide === "YES" ? "text-emerald-400" : "text-red-400"}`}>{userSide}</span>
                  <span className="text-[10px] text-gray-400">{userShares.toFixed(1)} shares</span>
                  <span className={`text-[10px] font-bold ${userProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {userProfit >= 0 ? "+" : ""}${userProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full" />
            )}
          </div>

          {txDone && (
            <div className="absolute inset-x-4 bottom-14 text-center text-xs text-emerald-400 font-semibold">
              ✓ Prediction placed!
            </div>
          )}

          {/* CTA button – always occupies the same space at the bottom */}
          <div className="mt-auto shrink-0">
            {isActive ? (
              <button
                onClick={() => setExpanded((v) => !v)}
                className={`w-full py-2 rounded-xl text-white text-xs font-bold transition-colors tracking-wide flex items-center justify-center gap-1.5 ${
                  expanded ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                {expanded ? "Close" : "Buy Shares"}
                <svg
                  className={`w-3 h-3 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                  viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : market.resolved ? (
              <p className="text-[10px] text-gray-600 text-center py-2">
                Resolved · outcome{" "}
                <span className={market.outcome ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                  {market.outcome ? "YES" : "NO"}
                </span>
                {payout > 0n && (
                  <span className="text-emerald-400 font-semibold"> · ${formatUsdc(payout)} claimable</span>
                )}
              </p>
            ) : (
              <p className="text-[10px] text-gray-600 text-center py-2">Market ended</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Dropdown buy panel – slides down below the fixed card ── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded && isActive ? "max-h-[20rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-gray-900 border border-t-0 border-gray-600 rounded-b-2xl p-4 flex flex-col gap-3 shadow-xl shadow-black/50">
          {/* YES / NO tab switcher */}
          <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setTab("yes")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === "yes"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setTab("no")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === "no"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              NO
            </button>
          </div>

          {/* Amount input */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-semibold">$</span>
            <input
              type="number"
              placeholder="0.00"
              value={stakeInput}
              onChange={(e) => { setStakeInput(e.target.value); setError(""); }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-7 pr-14 py-2.5 text-sm font-bold text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
              autoFocus={expanded}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-semibold">USDC</span>
          </div>

          {/* Live preview stats */}
          {stakeNum > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Shares" value={previewShares.toFixed(2)} />
              <StatBox label="Pot. Payout" value={`$${previewPayout.toFixed(2)}`} green />
              <StatBox label="Pot. Profit" value={`+$${previewProfit.toFixed(2)}`} green />
            </div>
          )}

          {/* Price info */}
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>Price/share: <span className="text-gray-400 font-semibold">{(activePps * 100).toFixed(1)}¢</span></span>
            <span>Max return: <span className="text-gray-400 font-semibold">{previewMultiple}×</span></span>
          </div>

          {error && <p className="text-[10px] text-red-400 text-center">{error}</p>}

          <button
            onClick={handlePredict}
            disabled={loading || !stakeInput}
            className={`w-full py-2 rounded-xl text-white text-xs font-bold transition-colors disabled:opacity-40 ${
              tab === "yes"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {loading ? "Confirming…" : `Buy ${tab.toUpperCase()} shares`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tiny stat box ─────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value: string;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="flex flex-col items-center bg-gray-800/80 rounded-lg px-2 py-1.5 gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
      <span className={`text-xs font-bold ${green ? "text-emerald-400" : red ? "text-red-400" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Market List ───────────────────────────────────────────────────────────────

export function MarketList() {
  const { nextMarketId, predict, usdcBalance } = useProtocol();
  const { address: walletAddress } = useAccount();

  async function handlePredict(id: bigint, yes: boolean, stake: string) {
    await predict(id, yes, stake);
  }

  const ids = Array.from({ length: nextMarketId }, (_, i) => BigInt(i));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Prediction Markets
        </h2>
        <span className="text-xs text-gray-600">{nextMarketId} markets</span>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
        💡 Predict correctly → ArcIQ score rises → higher yield multiplier + borrow limit
      </div>

      {ids.length === 0 && (
        <div className="text-center text-gray-600 py-8 text-sm">No markets yet</div>
      )}

      <div className="grid grid-cols-3 gap-3 items-start">
        {ids.map((id) => (
          <MarketCard
            key={id.toString()}
            id={id}
            predict={handlePredict}
            walletAddress={walletAddress}
          />
        ))}
      </div>
    </div>
  );
}

function formatTimeLeft(endTimeSec: number): string {
  const diff = endTimeSec * 1000 - Date.now();
  if (diff <= 0) return "Ended";
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}
