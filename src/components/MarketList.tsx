"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc } from "../lib/contracts";
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

function useMarketData(id: bigint) {
  return useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket",
    args: [id],
  });
}

function MarketRow({ id, predict }: { id: bigint; predict: (id: bigint, yes: boolean, stake: string) => Promise<void> }) {
  const { data: m } = useMarketData(id);
  const [stakeInput, setStakeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txDone, setTxDone] = useState(false);

  if (!m) return <div className="bg-gray-800 rounded-xl p-4 animate-pulse h-24" />;

  const market = m as unknown as Market;
  const total = market.yesPool + market.noPool;
  const yesPct = total > 0n ? Math.round(Number(market.yesPool * 100n / total)) : 50;
  const noPct = 100 - yesPct;
  const ended = Date.now() > Number(market.endTime) * 1000;
  const timeLeft = ended ? "Ended" : formatTimeLeft(Number(market.endTime));

  async function handlePredict(yes: boolean) {
    setError("");
    if (!stakeInput || isNaN(Number(stakeInput)) || Number(stakeInput) <= 0) {
      setError("Enter a stake amount");
      return;
    }
    setLoading(true);
    try {
      await predict(id, yes, stakeInput);
      setStakeInput("");
      setTxDone(true);
      setTimeout(() => setTxDone(false), 3000);
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white leading-snug">{market.question}</p>
        <span className={`text-xs shrink-0 px-2 py-0.5 rounded-full font-medium ${
          market.resolved
            ? "bg-gray-700 text-gray-400"
            : ended
            ? "bg-amber-400/10 text-amber-400"
            : "bg-emerald-400/10 text-emerald-400"
        }`}>
          {market.resolved ? (market.outcome ? "✓ YES" : "✗ NO") : timeLeft}
        </span>
      </div>

      {/* Pool bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>YES {yesPct}% · ${formatUsdc(market.yesPool)}</span>
          <span>${formatUsdc(market.noPool)} · {noPct}% NO</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-700">
          <div className="bg-emerald-500 transition-all" style={{ width: `${yesPct}%` }} />
          <div className="bg-red-500 transition-all" style={{ width: `${noPct}%` }} />
        </div>
        <p className="text-xs text-gray-600">Total pool: ${formatUsdc(total)} · Fees: ${formatUsdc(market.feePool)}</p>
      </div>

      {/* Predict controls */}
      {!market.resolved && !ended && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              type="number"
              placeholder="Stake amount (USDC)"
              value={stakeInput}
              onChange={(e) => { setStakeInput(e.target.value); setError(""); }}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">USDC</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handlePredict(true)}
              disabled={loading || !stakeInput}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold py-2 rounded-lg transition-colors"
            >
              {loading ? "..." : "✓ Stake YES"}
            </button>
            <button
              onClick={() => handlePredict(false)}
              disabled={loading || !stakeInput}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-bold py-2 rounded-lg transition-colors"
            >
              {loading ? "..." : "✗ Stake NO"}
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {txDone && <p className="text-xs text-emerald-400">✓ Prediction placed!</p>}
        </div>
      )}

      {market.resolved && (
        <p className="text-xs text-gray-500">
          Market resolved · outcome:{" "}
          <span className={market.outcome ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
            {market.outcome ? "YES" : "NO"}
          </span>
        </p>
      )}
    </div>
  );
}

export function MarketList() {
  const { nextMarketId, predict, usdcBalance } = useProtocol();

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

      <div className="flex flex-col gap-3">
        {ids.map((id) => (
          <MarketRow key={id.toString()} id={id} predict={handlePredict} />
        ))}
      </div>
    </div>
  );
}

function formatTimeLeft(endTimeSec: number): string {
  const diff = endTimeSec * 1000 - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m left`;
}
