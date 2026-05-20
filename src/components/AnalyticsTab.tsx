"use client";

import { useReadContract } from "wagmi";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc, CONTRACT_ADDRESSES, PREDICTION_MARKET_ABI } from "../lib/contracts";

const MARKET_ADDR = CONTRACT_ADDRESSES.predictionMarket as `0x${string}`;

interface Market {
  question:  string;
  endTime:   bigint;
  resolved:  boolean;
  outcome:   boolean;
  yesPool:   bigint;
  noPool:    bigint;
  feePool:   bigint;
}

// Fetches a single market's data
function useMarketData(id: number, enabled: boolean) {
  return useReadContract({
    address: MARKET_ADDR,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket",
    args: [BigInt(id)],
    query: { enabled },
  });
}

// Renders one row in the market breakdown table
function MarketRow({ id, now }: { id: number; now: number }) {
  const { data } = useMarketData(id, true);
  if (!data) {
    return (
      <div className="h-14 rounded-xl animate-pulse bg-gray-800 mx-4 mb-2" />
    );
  }
  const m = data as unknown as Market;
  const total = m.yesPool + m.noPool;
  const totalUsd = Number(total) / 1e6;
  const yesPct = total > 0n ? Math.round(Number(m.yesPool * 100n / total)) : 50;
  const ended = Number(m.endTime) <= now;
  const status = m.resolved
    ? `Resolved · ${m.outcome ? "YES" : "NO"}`
    : ended ? "Pending" : "Live";
  const statusColor = m.resolved
    ? "text-emerald-400"
    : ended ? "text-amber-400" : "text-blue-400";

  return (
    <div className="px-4 py-3 border-b border-gray-800 last:border-0">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug truncate">{m.question}</p>
          <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
            <span>Market {id}</span>
            <span className={`font-medium ${statusColor}`}>{status}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">${totalUsd.toFixed(2)}</p>
          <p className="text-xs text-gray-500">pool</p>
        </div>
      </div>
      {/* YES/NO bar */}
      <div className="h-1.5 rounded-full overflow-hidden bg-gray-700">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${yesPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-0.5">
        <span>YES {yesPct}%</span>
        <span>NO {100 - yesPct}%</span>
      </div>
    </div>
  );
}

// Aggregates all market data for stats — rendered invisibly, pushes data up via callback
function MarketAggregator({
  ids,
  onData,
}: {
  ids: number[];
  onData: (stats: { totalPool: bigint; totalTrades: number; activeTrades: number }) => void;
}) {
  // We can't do dynamic hook arrays, so we cap at 20 markets for aggregation
  // and collect data in the parent via the MarketRow-level reads instead.
  // This component is intentionally empty — aggregation happens inline below.
  return null;
}

// Stat card
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Single-market hook used for aggregation ──────────────────────────────────

function useAllMarkets(count: number) {
  const m0  = useMarketData(0,  count > 0);
  const m1  = useMarketData(1,  count > 1);
  const m2  = useMarketData(2,  count > 2);
  const m3  = useMarketData(3,  count > 3);
  const m4  = useMarketData(4,  count > 4);
  const m5  = useMarketData(5,  count > 5);
  const m6  = useMarketData(6,  count > 6);
  const m7  = useMarketData(7,  count > 7);
  const m8  = useMarketData(8,  count > 8);
  const m9  = useMarketData(9,  count > 9);
  const m10 = useMarketData(10, count > 10);
  const m11 = useMarketData(11, count > 11);
  const m12 = useMarketData(12, count > 12);
  const m13 = useMarketData(13, count > 13);
  const m14 = useMarketData(14, count > 14);
  const m15 = useMarketData(15, count > 15);
  const m16 = useMarketData(16, count > 16);
  const m17 = useMarketData(17, count > 17);
  const m18 = useMarketData(18, count > 18);
  const m19 = useMarketData(19, count > 19);

  return [m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19]
    .slice(0, count)
    .map(r => r.data as unknown as Market | undefined);
}

// ── Mini sparkline-style pool bar chart ──────────────────────────────────────

function PoolChart({ markets, ids }: { markets: (Market | undefined)[]; ids: number[] }) {
  const bars = markets
    .map((m, i) => ({ id: ids[i], pool: m ? Number(m.yesPool + m.noPool) / 1e6 : null }))
    .filter(b => b.pool !== null && b.pool! > 0) as { id: number; pool: number }[];

  if (bars.length === 0) return null;
  const max = Math.max(...bars.map(b => b.pool));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Pool Size by Market (USDC)
      </p>
      <div className="flex items-end gap-2 h-28">
        {bars.map(b => (
          <div key={b.id} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-gray-300">${b.pool.toFixed(0)}</span>
            <div className="w-full relative" style={{ height: 64 }}>
              <div
                className="absolute bottom-0 w-full rounded-t bg-blue-600 transition-all duration-500"
                style={{ height: `${Math.max((b.pool / max) * 100, 4)}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">M{b.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const { nextMarketId } = useProtocol();

  const count = Math.min(nextMarketId, 20); // cap at 20 for static hook array
  const ids   = Array.from({ length: count }, (_, i) => i);
  const now   = Math.floor(Date.now() / 1000);

  const markets = useAllMarkets(count);

  // ── Aggregate stats ─────────────────────────────────────────────────────
  let totalPool    = 0;   // USDC cents sum → display as $
  let totalTrades  = 0;   // count of markets that have any pool (proxy for trade count)
  let activeTrades = 0;   // unresolved markets that haven't ended
  const loaded     = markets.filter(Boolean).length;

  for (const m of markets) {
    if (!m) continue;
    const pool = Number(m.yesPool + m.noPool) / 1e6;
    totalPool += pool;
    // Each market with a non-zero pool represents at least one trade
    if (pool > 0) totalTrades++;
    // Active = not resolved and not ended
    if (!m.resolved && Number(m.endTime) > now) activeTrades++;
  }

  // Active traders proxy: markets with activity is the best on-chain signal we have
  // without a subgraph. Show markets that have both YES and NO stakes (contested = multiple traders).
  const contestedMarkets = markets.filter(m => m && m.yesPool > 0n && m.noPool > 0n).length;
  const isLoading = loaded < count && count > 0;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Analytics</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Live on-chain stats from the ArcIQ prediction market.
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Total Volume / Pool"
          value={`$${totalPool.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="USDC across all markets"
          accent="text-blue-400"
        />
        <StatCard
          label="Total Markets"
          value={String(count)}
          sub={isLoading ? `${loaded} / ${count} loaded` : "all loaded"}
        />
        <StatCard
          label="Active Markets"
          value={String(activeTrades)}
          sub="unresolved & open"
          accent="text-emerald-400"
        />
        <StatCard
          label="Markets Resolved"
          value={String(markets.filter(m => m?.resolved).length)}
          sub={`of ${count} total`}
          accent="text-purple-400"
        />
      </div>


      {/* Pool chart */}
      {loaded > 0 && <PoolChart markets={markets} ids={ids} />}

      {/* Market breakdown table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Market Breakdown
          </p>
        </div>

        {count === 0 ? (
          <div className="py-10 text-center text-sm text-gray-600">
            No markets created yet.
          </div>
        ) : (
          <div className="py-2">
            {ids.map(id => (
              <MarketRow key={id} id={id} now={now} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
