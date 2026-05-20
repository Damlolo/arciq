"use client";
import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useProtocol } from "@/hooks/useProtocol";
import {
  CONTRACT_ADDRESSES,
  PREDICTION_MARKET_ABI,
  REPUTATION_ENGINE_ABI,
  formatUsdc,
} from "@/lib/contracts";

const MARKET_ADDR = CONTRACT_ADDRESSES.predictionMarket as `0x${string}`;
const REP_ADDR    = CONTRACT_ADDRESSES.reputationEngine  as `0x${string}`;

// ─── Per-market data collector (invisible, just feeds parent) ──────────────

type PredictionStatus = "active" | "won" | "lost" | "pending" | "claimable";

interface PredictionEntry {
  marketId: number;
  question: string;
  side: "YES" | "NO";
  stake: bigint;
  status: PredictionStatus;
  payout: bigint;
  endTime: number;
  resolved: boolean;
  outcome: boolean;
}

function MarketDataCollector({
  id,
  address,
  onData,
}: {
  id: number;
  address: `0x${string}`;
  onData: (id: number, entry: PredictionEntry | null) => void;
}) {
  const { data: market } = useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket",
    args: [BigInt(id)],
  });

  const { data: position } = useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getPosition",
    args: [BigInt(id), address],
  });

  const { data: payout } = useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "previewWinnings",
    args: [BigInt(id), address],
  });

  useEffect(() => {
    if (!market || !position) return;
    const m = market as any;
    const p = position as any;
    if (p.yesStake === 0n && p.noStake === 0n) { onData(id, null); return; }

    const side = p.yesStake > 0n ? "YES" : "NO";
    const stake = p.yesStake > 0n ? p.yesStake : p.noStake;
    const now = Math.floor(Date.now() / 1000);
    const payoutVal = (payout ?? 0n) as bigint;

    let s: PredictionStatus = "active";
    if (m.resolved) {
      const won = m.outcome ? p.yesStake > 0n : p.noStake > 0n;
      s = won && payoutVal > 0n ? "claimable" : won ? "won" : "lost";
    } else if (Number(m.endTime) <= now) {
      s = "pending";
    }

    onData(id, {
      marketId: id,
      question: m.question,
      side,
      stake,
      status: s,
      payout: payoutVal,
      endTime: Number(m.endTime),
      resolved: m.resolved,
      outcome: m.outcome,
    });
  }, [market, position, payout]);

  return null;
}

// ─── Single prediction row ─────────────────────────────────────────────────

function PredictionRow({ id, address }: { id: number; address: `0x${string}` }) {
  const { data: market } = useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket",
    args: [BigInt(id)],
  });

  const { data: position } = useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getPosition",
    args: [BigInt(id), address],
  });

  const { data: payout } = useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "previewWinnings",
    args: [BigInt(id), address],
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [txStatus, setTxStatus] = useState("");

  if (!market || !position) return null;

  const m = market as any;
  const p = position as any;
  if (p.yesStake === 0n && p.noStake === 0n) return null;

  const side = p.yesStake > 0n ? "YES" : "NO";
  const stake = p.yesStake > 0n ? p.yesStake : p.noStake;
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(m.endTime) - now;
  const timeLeft =
    diff <= 0
      ? "Ended"
      : diff > 86400
      ? `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h remaining`
      : `${Math.floor(diff / 3600)}h remaining`;

  const payoutVal = (payout ?? 0n) as bigint;

  let badgeLabel = "Active";
  let badgeCls = "bg-gray-800 text-gray-400";

  if (m.resolved) {
    const won = m.outcome ? p.yesStake > 0n : p.noStake > 0n;
    if (won && payoutVal > 0n) { badgeLabel = "Claim"; badgeCls = "bg-green-900/40 text-green-400"; }
    else if (won) { badgeLabel = "Won"; badgeCls = "bg-green-900/40 text-green-400"; }
    else { badgeLabel = "Lost"; badgeCls = "bg-red-900/30 text-red-400"; }
  } else if (Number(m.endTime) <= now) {
    badgeLabel = "Awaiting result";
    badgeCls = "bg-yellow-900/30 text-yellow-500";
  }

  async function handleClaim() {
    try {
      setTxStatus("Claiming...");
      await writeContractAsync({
        address: MARKET_ADDR,
        abi: PREDICTION_MARKET_ABI,
        functionName: "claimWinnings",
        args: [BigInt(id)],
      });
      setTxStatus("Claimed ✓");
    } catch (e: any) {
      setTxStatus("Error: " + (e?.shortMessage ?? e?.message));
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-white leading-snug flex-1">{m.question}</p>
        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${badgeCls}`}>
          {badgeLabel}
        </span>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-0">
        <span className={`font-semibold ${side === "YES" ? "text-green-500" : "text-red-400"}`}>
          {side}
        </span>
        <span>Staked ${formatUsdc(stake)}</span>
        <span>{timeLeft}</span>
      </div>
      {(m.resolved || Number(m.endTime) <= now) && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {m.resolved ? (
              <>
                Settled:{" "}
                <span className="font-semibold text-white">{m.outcome ? "YES" : "NO"} won</span>
                {payoutVal > 0n && (
                  <span className="ml-2 text-green-500 font-semibold">
                    +${formatUsdc(payoutVal)}
                  </span>
                )}
              </>
            ) : (
              <span>Market ended — waiting for oracle resolution</span>
            )}
          </div>
          {m.resolved && payoutVal > 0n && (
            <button
              onClick={handleClaim}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "..." : "Claim"}
            </button>
          )}
        </div>
      )}
      {txStatus && <p className="text-xs mt-1.5 text-gray-500">{txStatus}</p>}
    </div>
  );
}

// ─── Main tab ──────────────────────────────────────────────────────────────

type FilterTab = "OPEN" | "CLOSED" | "WON" | "LOST";

export function PredictionsTab() {
  const { address } = useAccount();
  const { nextMarketId, score } = useProtocol();

  // Reputation from chain
  const { data: totalPredictions } = useReadContract({
    address: REP_ADDR,
    abi: [
      {
        name: "hasScore",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ type: "bool" }],
      },
    ] as const,
    functionName: "hasScore",
    args: [address!],
    query: { enabled: !!address },
  });

  const [entries, setEntries] = useState<Map<number, PredictionEntry | null>>(new Map());
  const [filter, setFilter] = useState<FilterTab>("OPEN");

  const handleData = (id: number, entry: PredictionEntry | null) =>
    setEntries(prev => new Map(prev).set(id, entry));

  const all = Array.from(entries.values()).filter(Boolean) as PredictionEntry[];
  const open     = all.filter(p => p.status === "active");
  const closed   = all.filter(p => ["pending", "won", "lost", "claimable"].includes(p.status));
  const won      = all.filter(p => p.status === "won" || p.status === "claimable");
  const lost     = all.filter(p => p.status === "lost");
  const claimable = all.filter(p => p.status === "claimable");
  const totalClaimable = claimable.reduce((s, p) => s + p.payout, 0n);

  const filterMap: Record<FilterTab, PredictionEntry[]> = { OPEN: open, CLOSED: closed, WON: won, LOST: lost };
  const filtered = filterMap[filter];

  const filterTabs: { id: FilterTab; count: number }[] = [
    { id: "OPEN",   count: open.length   },
    { id: "CLOSED", count: closed.length },
    { id: "WON",    count: won.length    },
    { id: "LOST",   count: lost.length   },
  ];

  if (!address) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-500 text-sm">
        Connect your wallet to view your predictions
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden data collectors */}
      {Array.from({ length: nextMarketId }, (_, i) => (
        <MarketDataCollector key={i} id={i} address={address as `0x${string}`} onData={handleData} />
      ))}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: "Total", v: all.length,  c: "text-white"      },
          { l: "Open",  v: open.length, c: "text-blue-500"   },
          { l: "Won",   v: won.length,  c: "text-green-500"  },
          { l: "Lost",  v: lost.length, c: "text-red-400"    },
        ].map(s => (
          <div key={s.l} className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center">
            <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
            <div className="text-xs mt-0.5 text-gray-500">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Claimable banner */}
      {claimable.length > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
          <div className="text-sm font-semibold text-white">
            {claimable.length} prediction{claimable.length > 1 ? "s" : ""} ready to claim
          </div>
          <div className="text-xs mt-0.5 text-gray-500">
            ${formatUsdc(totalClaimable)} USDC available
          </div>
        </div>
      )}

      {/* Score progress */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">ArcIQ Progress</p>
          <span className="text-sm font-bold text-white">{score} / 100</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-gray-800">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${score}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-2 text-gray-500">
          <span>{all.length} predictions tracked</span>
          <span>{won.length} correct</span>
          <span>
            {all.length > 0 ? Math.round((won.length / all.length) * 100) : 0}% accuracy
          </span>
        </div>
        {all.length > 0 && (
          <div className="flex gap-0.5 items-end h-5 mt-3">
            {all.slice(-24).map((p, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${
                  p.status === "won" || p.status === "claimable"
                    ? "bg-green-500"
                    : p.status === "lost"
                    ? "bg-red-500/60"
                    : "bg-gray-700"
                }`}
                style={{
                  height:
                    p.status === "won" || p.status === "claimable"
                      ? "100%"
                      : p.status === "lost"
                      ? "50%"
                      : "70%",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filter tabs + list */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="flex border-b border-gray-800">
          {filterTabs.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                filter === f.id
                  ? "text-white border-b-2 border-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {f.id}{f.count > 0 ? ` · ${f.count}` : ""}
            </button>
          ))}
        </div>

        <div className="p-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              <div className="text-sm font-medium mb-1 text-white">
                {filter === "OPEN"   ? "No open predictions"   :
                 filter === "CLOSED" ? "No closed predictions" :
                 filter === "WON"    ? "No wins yet"           : "No losses yet"}
              </div>
              <div className="text-xs">
                {filter === "OPEN"
                  ? "Go to PREDICT to stake on a market"
                  : "Predictions move here once markets close"}
              </div>
            </div>
          ) : (
            filtered.map(p => (
              <PredictionRow key={p.marketId} id={p.marketId} address={address as `0x${string}`} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
