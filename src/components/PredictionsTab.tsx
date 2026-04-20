"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useMarketCount, useMarket, usePredict, useReputation } from "@/hooks/useProtocol";
import { formatUSDC } from "@/lib/contracts";
import { useTheme } from "@/app/page";

type PredictionStatus = "active" | "won" | "lost" | "pending" | "claimable";

interface PredictionEntry {
  marketId: number; question: string; side: "YES" | "NO"; stake: bigint;
  status: PredictionStatus; payout: bigint; endTime: number; resolved: boolean; outcome: boolean;
}

function MarketDataCollector({ id, onData }: { id: number; onData: (id: number, e: PredictionEntry | null) => void }) {
  const { market, position, payout } = useMarket(id);
  useEffect(() => {
    if (!market || !position) return;
    if (position.yesStake === 0n && position.noStake === 0n) { onData(id, null); return; }
    const now = Math.floor(Date.now() / 1000);
    const side = position.yesStake > 0n ? "YES" : "NO";
    const stake = position.yesStake > 0n ? position.yesStake : position.noStake;
    let s: PredictionStatus = "active";
    if (market.resolved) {
      const won = market.outcome ? position.yesStake > 0n : position.noStake > 0n;
      s = won && payout > 0n ? "claimable" : won ? "won" : "lost";
    } else if (Number(market.endTime) <= now) {
      s = "pending"; // ended but not resolved yet
    }
    onData(id, { marketId: id, question: market.question, side, stake, status: s, payout, endTime: Number(market.endTime), resolved: market.resolved, outcome: market.outcome });
  }, [market, position, payout]);
  return null;
}

function PredictionRow({ id }: { id: number }) {
  const { market, position, payout, refetch } = useMarket(id);
  const { claimWinnings, isPending } = usePredict();
  const { dark } = useTheme();
  const [txStatus, setTxStatus] = useState("");

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  const main = dark ? "text-white" : "text-gray-900";
  const divider = dark ? "border-gray-800" : "border-gray-100";

  if (!market || !position) return null;
  if (position.yesStake === 0n && position.noStake === 0n) return null;

  const side = position.yesStake > 0n ? "YES" : "NO";
  const stake = position.yesStake > 0n ? position.yesStake : position.noStake;
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(market.endTime) - now;
  const timeLeft = diff <= 0 ? "Ended" : diff > 86400
    ? `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h remaining`
    : `${Math.floor(diff / 3600)}h remaining`;

  // Determine badge
  let badgeLabel = "Active";
  let badgeCls = dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500";

  if (market.resolved) {
    const won = market.outcome ? position.yesStake > 0n : position.noStake > 0n;
    if (won && payout > 0n) { badgeLabel = "Claim"; badgeCls = dark ? "bg-green-900/40 text-green-400" : "bg-green-50 text-green-700"; }
    else if (won) { badgeLabel = "Won"; badgeCls = dark ? "bg-green-900/40 text-green-400" : "bg-green-50 text-green-700"; }
    else { badgeLabel = "Lost"; badgeCls = dark ? "bg-red-900/30 text-red-400" : "bg-red-50 text-red-600"; }
  } else if (Number(market.endTime) <= now) {
    badgeLabel = "Awaiting result";
    badgeCls = dark ? "bg-yellow-900/30 text-yellow-500" : "bg-yellow-50 text-yellow-700";
  }

  async function handleClaim() {
    try {
      setTxStatus("Claiming...");
      await claimWinnings(id);
      setTxStatus("Claimed");
      refetch();
    } catch (e: any) { setTxStatus("Error: " + (e?.shortMessage ?? e?.message)); }
  }

  return (
    <div className={`rounded-xl border p-4 ${card}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className={`text-sm font-medium leading-snug flex-1 ${main}`}>{market.question}</p>
        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${badgeCls}`}>{badgeLabel}</span>
      </div>
      <div className={`flex flex-wrap gap-3 text-xs mb-0 ${sub}`}>
        <span className={`font-semibold ${side === "YES" ? dark ? "text-green-500" : "text-green-600" : dark ? "text-red-400" : "text-red-500"}`}>{side}</span>
        <span>Staked ${formatUSDC(stake)}</span>
        <span>{timeLeft}</span>
      </div>
      {(market.resolved || Number(market.endTime) <= now) && (
        <div className={`mt-3 pt-3 border-t flex items-center justify-between gap-3 ${divider}`}>
          <div className={`text-xs ${sub}`}>
            {market.resolved
              ? <>Settled: <span className={`font-semibold ${main}`}>{market.outcome ? "YES" : "NO"} won</span>{payout > 0n && <span className="ml-2 text-green-500 font-semibold">+${formatUSDC(payout)}</span>}</>
              : <span>Market ended — waiting for oracle resolution</span>
            }
          </div>
          {market.resolved && payout > 0n && (
            <button onClick={handleClaim} disabled={isPending}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${dark ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-900 text-white hover:bg-gray-700"} disabled:opacity-50`}>
              {isPending ? "..." : "Claim"}
            </button>
          )}
        </div>
      )}
      {txStatus && <p className={`text-xs mt-1.5 ${sub}`}>{txStatus}</p>}
    </div>
  );
}

type FilterTab = "OPEN" | "CLOSED" | "WON" | "LOST";

export function PredictionsTab() {
  const count = useMarketCount();
  const { address } = useAccount();
  const { score, totalPredictions, wins } = useReputation(address);
  const { dark } = useTheme();
  const [entries, setEntries] = useState<Map<number, PredictionEntry | null>>(new Map());
  const [filter, setFilter] = useState<FilterTab>("OPEN");

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  const main = dark ? "text-white" : "text-gray-900";
  const tabBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";

  const handleData = (id: number, entry: PredictionEntry | null) =>
    setEntries(prev => new Map(prev).set(id, entry));

  const all = Array.from(entries.values()).filter(Boolean) as PredictionEntry[];

  // Categorise
  const open = all.filter(p => p.status === "active");
  const closed = all.filter(p => p.status === "pending" || p.status === "won" || p.status === "lost" || p.status === "claimable");
  const won = all.filter(p => p.status === "won" || p.status === "claimable");
  const lost = all.filter(p => p.status === "lost");
  const claimable = all.filter(p => p.status === "claimable");
  const totalClaimable = claimable.reduce((s, p) => s + p.payout, 0n);

  const filterMap: Record<FilterTab, PredictionEntry[]> = { OPEN: open, CLOSED: closed, WON: won, LOST: lost };
  const filtered = filterMap[filter];

  const filterTabs: { id: FilterTab; count: number }[] = [
    { id: "OPEN", count: open.length },
    { id: "CLOSED", count: closed.length },
    { id: "WON", count: won.length },
    { id: "LOST", count: lost.length },
  ];

  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => <MarketDataCollector key={i} id={i} onData={handleData} />)}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: "Total", v: all.length },
          { l: "Open", v: open.length, c: "text-blue-500" },
          { l: "Won", v: won.length, c: "text-green-500" },
          { l: "Lost", v: lost.length, c: dark ? "text-red-400" : "text-red-500" },
        ].map(s => (
          <div key={s.l} className={`rounded-xl border p-3 text-center ${card}`}>
            <div className={`text-2xl font-bold ${(s as any).c ?? main}`}>{s.v}</div>
            <div className={`text-xs mt-0.5 ${sub}`}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Claimable banner */}
      {claimable.length > 0 && (
        <div className={`rounded-xl border p-4 ${dark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <div className={`text-sm font-semibold ${main}`}>{claimable.length} prediction{claimable.length > 1 ? "s" : ""} ready to claim</div>
          <div className={`text-xs mt-0.5 ${sub}`}>${formatUSDC(totalClaimable)} USDC available</div>
        </div>
      )}

      {/* Score progress */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <div className="flex justify-between items-center mb-2">
          <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>ArcIQ Progress</p>
          <span className={`text-sm font-bold ${main}`}>{score} / 100</span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${score}%` }} />
        </div>
        <div className={`flex justify-between text-xs mt-2 ${sub}`}>
          <span>{Number(totalPredictions)} predictions</span>
          <span>{Number(wins)} correct</span>
          <span>{Number(totalPredictions) > 0 ? Math.round(Number(wins) / Number(totalPredictions) * 100) : 0}% accuracy</span>
        </div>
        {all.length > 0 && (
          <div className="flex gap-0.5 items-end h-5 mt-3">
            {all.slice(-24).map((p, i) => (
              <div key={i} className={`flex-1 rounded-sm ${
                p.status === "won" || p.status === "claimable" ? "bg-green-500"
                : p.status === "lost" ? dark ? "bg-red-500/60" : "bg-red-300"
                : dark ? "bg-gray-700" : "bg-gray-200"
              }`} style={{ height: p.status === "won" || p.status === "claimable" ? "100%" : p.status === "lost" ? "50%" : "70%" }} />
            ))}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className={`rounded-xl border overflow-hidden ${tabBg}`}>
        <div className={`flex border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
          {filterTabs.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                filter === f.id
                  ? dark ? "text-white border-b-2 border-white" : "text-gray-900 border-b-2 border-gray-900"
                  : `${sub} hover:${dark ? "text-gray-300" : "text-gray-600"}`
              }`}>
              {f.id}{f.count > 0 ? ` · ${f.count}` : ""}
            </button>
          ))}
        </div>

        <div className="p-3 space-y-3">
          {filtered.length === 0 ? (
            <div className={`py-10 text-center ${sub}`}>
              <div className={`text-sm font-medium mb-1 ${main}`}>
                {filter === "OPEN" ? "No open predictions" : filter === "CLOSED" ? "No closed predictions" : filter === "WON" ? "No wins yet" : "No losses yet"}
              </div>
              <div className="text-xs">
                {filter === "OPEN" ? "Go to PREDICT to stake on a market" : "Predictions move here once markets close"}
              </div>
            </div>
          ) : filtered.map(p => <PredictionRow key={p.marketId} id={p.marketId} />)}
        </div>
      </div>
    </div>
  );
}
