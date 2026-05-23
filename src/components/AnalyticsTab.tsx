"use client";

import { useReadContract } from "wagmi";
import { useProtocol } from "../hooks/useProtocol";
import { CONTRACT_ADDRESSES, PREDICTION_MARKET_ABI } from "../lib/contracts";

const MARKET_ADDR = CONTRACT_ADDRESSES.predictionMarket as `0x${string}`;

interface Market {
  question: string;
  endTime:  bigint;
  resolved: boolean;
  outcome:  boolean;
  yesPool:  bigint;
  noPool:   bigint;
  feePool:  bigint;
  mode:     number;
}

function useMarketData(id: number, enabled: boolean) {
  return useReadContract({
    address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket", args: [BigInt(id)],
    query: { enabled },
  });
}

// ─── Static hook for up to 50 markets ─────────────────────────────────────
function useAllMarkets(count: number) {
  const hooks = [
    useMarketData(0,count>0),  useMarketData(1,count>1),  useMarketData(2,count>2),
    useMarketData(3,count>3),  useMarketData(4,count>4),  useMarketData(5,count>5),
    useMarketData(6,count>6),  useMarketData(7,count>7),  useMarketData(8,count>8),
    useMarketData(9,count>9),  useMarketData(10,count>10),useMarketData(11,count>11),
    useMarketData(12,count>12),useMarketData(13,count>13),useMarketData(14,count>14),
    useMarketData(15,count>15),useMarketData(16,count>16),useMarketData(17,count>17),
    useMarketData(18,count>18),useMarketData(19,count>19),useMarketData(20,count>20),
    useMarketData(21,count>21),useMarketData(22,count>22),useMarketData(23,count>23),
    useMarketData(24,count>24),useMarketData(25,count>25),useMarketData(26,count>26),
    useMarketData(27,count>27),useMarketData(28,count>28),useMarketData(29,count>29),
    useMarketData(30,count>30),useMarketData(31,count>31),useMarketData(32,count>32),
    useMarketData(33,count>33),useMarketData(34,count>34),useMarketData(35,count>35),
    useMarketData(36,count>36),useMarketData(37,count>37),useMarketData(38,count>38),
    useMarketData(39,count>39),useMarketData(40,count>40),useMarketData(41,count>41),
    useMarketData(42,count>42),useMarketData(43,count>43),useMarketData(44,count>44),
    useMarketData(45,count>45),useMarketData(46,count>46),useMarketData(47,count>47),
    useMarketData(48,count>48),useMarketData(49,count>49),
  ];
  return hooks.slice(0, count).map(r => r.data as unknown as Market | undefined);
}

// ─── Premium stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="stat-card">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2">{label}</p>
      <p className="text-[26px] font-black tracking-tight" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
  );
}

// ─── Pool bar chart ────────────────────────────────────────────────────────
function PoolChart({ markets, ids }: { markets: (Market | undefined)[]; ids: number[] }) {
  const bars = markets
    .map((m, i) => ({ id: ids[i], pool: m ? Number(m.yesPool + m.noPool) / 1e6 : null, resolved: m?.resolved }))
    .filter(b => b.pool !== null && b.pool! > 0) as { id: number; pool: number; resolved: boolean }[];

  if (bars.length === 0) return null;
  const max = Math.max(...bars.map(b => b.pool));

  return (
    <div className="surface-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-5">
        Pool size by market (USDC)
      </p>
      <div className="flex items-end gap-2 h-32">
        {bars.map(b => {
          const pct = Math.max((b.pool / max) * 100, 4);
          return (
            <div key={b.id} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                ${b.pool < 1000 ? b.pool.toFixed(0) : `${(b.pool/1000).toFixed(1)}k`}
              </span>
              <div className="w-full relative" style={{ height: 72 }}>
                <div className="absolute bottom-0 w-full rounded-t transition-all duration-700"
                  style={{
                    height: `${pct}%`,
                    background: b.resolved
                      ? "linear-gradient(180deg, #A78BFA, #6366F1)"
                      : "linear-gradient(180deg, #818CF8, #4F46E5)",
                    boxShadow: "0 0 8px rgba(99,102,241,0.3)"
                  }}
                />
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">M{b.id}</span>
            </div>
          );
        })}
      </div>
      {/* Y-axis hint */}
      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-subtle)]">
        <span>$0</span>
        <span className="text-[var(--accent-secondary)]">{bars.length} markets plotted</span>
        <span>${max.toFixed(0)}</span>
      </div>
    </div>
  );
}

// ─── Market breakdown row ──────────────────────────────────────────────────
function MarketRow({ id, now }: { id: number; now: number }) {
  const { data } = useMarketData(id, true);

  if (!data) {
    return (
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 flex items-center gap-3">
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-4 w-12 rounded ml-auto" />
      </div>
    );
  }

  const m     = data as unknown as Market;
  const total = m.yesPool + m.noPool;
  const totalUsd = Number(total) / 1e6;
  const yesPct   = total > 0n ? Math.round(Number(m.yesPool * 100n / total)) : 50;
  const ended    = Number(m.endTime) <= now;

  const statusConfig = m.resolved
    ? { label: `Resolved · ${m.outcome ? "YES" : "NO"} won`, color: m.outcome ? "var(--yes-color)" : "var(--no-color)" }
    : ended
    ? { label: "Pending resolution", color: "#F59E0B" }
    : { label: "Live", color: "var(--yes-color)" };

  return (
    <div className="px-4 py-3.5 border-b border-[var(--border-subtle)] last:border-0 group hover:bg-white/2 transition-colors">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[var(--text-primary)] font-medium leading-snug truncate">{m.question}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] font-mono text-[var(--text-muted)]">#{id}</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: statusConfig.color }}>
              {!m.resolved && !ended && (
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusConfig.color, animation: "pulse-dot 2s infinite" }} />
              )}
              {statusConfig.label}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] font-bold text-[var(--text-primary)]">${totalUsd.toFixed(2)}</p>
          <p className="text-[10px] text-[var(--text-muted)]">pool</p>
        </div>
      </div>

      {/* YES/NO bar */}
      <div className="progress-track">
        <div className="h-full rounded-l-full" style={{
          width: `${yesPct}%`,
          background: "linear-gradient(90deg, var(--yes-color), #34D399)"
        }} />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
        <span style={{ color: "var(--yes-color)" }}>YES {yesPct}%</span>
        <span style={{ color: "var(--no-color)" }}>NO {100 - yesPct}%</span>
      </div>
    </div>
  );
}

// ─── YES/NO distribution donut (SVG) ─────────────────────────────────────
function OutcomeDonut({ markets }: { markets: (Market | undefined)[] }) {
  const resolved = markets.filter(m => m?.resolved);
  const yesWins  = resolved.filter(m => m!.outcome).length;
  const noWins   = resolved.length - yesWins;
  const total    = resolved.length;

  if (total === 0) return null;

  const r        = 38;
  const circ     = 2 * Math.PI * r;
  const yesDash  = (yesWins / total) * circ;

  return (
    <div className="surface-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-4">
        Resolved outcomes
      </p>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative w-[100px] h-[100px] shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--no-color)" strokeWidth="10" strokeOpacity="0.3" />
            <circle cx="50" cy="50" r={r} fill="none"
              stroke="var(--yes-color)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${yesDash} ${circ}`}
              strokeDashoffset={circ * 0.25}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[16px] font-black text-[var(--text-primary)]">{total}</span>
            <span className="text-[10px] text-[var(--text-muted)]">resolved</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 flex-1">
          {[
            { label: "YES won", count: yesWins, color: "var(--yes-color)", pct: Math.round((yesWins/total)*100) },
            { label: "NO won",  count: noWins,  color: "var(--no-color)",  pct: Math.round((noWins/total)*100)  },
          ].map(({ label, count, color, pct }) => (
            <div key={label}>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="font-semibold" style={{ color }}>{label}</span>
                <span className="text-[var(--text-muted)]">{count} ({pct}%)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Analytics Tab ───────────────────────────────────────────────────
export function AnalyticsTab() {
  const { nextMarketId, totalPredictionFeesReceived, totalBorrowInterestReceived } = useProtocol();

  const count   = Math.min(nextMarketId, 50);
  const ids     = Array.from({ length: count }, (_, i) => i);
  const now     = Math.floor(Date.now() / 1000);
  const markets = useAllMarkets(count);

  let totalPool    = 0;
  let activeCount  = 0;
  let resolvedCount = 0;
  const loaded     = markets.filter(Boolean).length;

  for (const m of markets) {
    if (!m) continue;
    totalPool += Number(m.yesPool + m.noPool) / 1e6;
    if (!m.resolved && Number(m.endTime) > now) activeCount++;
    if (m.resolved) resolvedCount++;
  }

  const isLoading = loaded < count && count > 0;

  const predFees = Number(totalPredictionFeesReceived ?? 0n) / 1e6;
  const borFees  = Number(totalBorrowInterestReceived  ?? 0n) / 1e6;

  return (
    <div className="space-y-5">

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Total volume"
          value={`$${totalPool.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={isLoading ? `${loaded} / ${count} loaded` : "across all markets"}
          color="var(--accent-secondary)"
        />
        <StatCard
          label="Total markets"
          value={String(count)}
          sub={isLoading ? "loading…" : "all loaded"}
        />
        <StatCard
          label="Active markets"
          value={String(activeCount)}
          sub="unresolved & open"
          color="var(--yes-color)"
        />
        <StatCard
          label="Resolved"
          value={String(resolvedCount)}
          sub={`of ${count} total`}
          color="#A78BFA"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2">Prediction fees collected</p>
          <p className="text-[22px] font-black" style={{ color: "var(--yes-color)" }}>${predFees.toFixed(2)}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Distributed to vault depositors</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2">Borrow interest collected</p>
          <p className="text-[22px] font-black" style={{ color: "#38BDF8" }}>${borFees.toFixed(2)}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">5% APR from active loans</p>
        </div>
      </div>

      {/* Charts */}
      {loaded > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <PoolChart markets={markets} ids={ids} />
          <OutcomeDonut markets={markets} />
        </div>
      )}

      {/* Market breakdown table */}
      <div className="surface-card overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Market breakdown
          </p>
          {isLoading && (
            <span className="text-[11px] text-[var(--text-muted)]">Loading {loaded}/{count}…</span>
          )}
        </div>

        {count === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[var(--text-muted)] text-sm">No markets created yet.</p>
          </div>
        ) : (
          <div>
            {ids.map(id => <MarketRow key={id} id={id} now={now} />)}
          </div>
        )}
      </div>
    </div>
  );
}
