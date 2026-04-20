"use client";
import { useEffect, useState } from "react";
import { useMarketCount, useMarket } from "@/hooks/useProtocol";
import { useMarketAnalytics } from "@/hooks/useSupabase";
import { recordMarketSnapshot } from "@/lib/supabase";
import { formatUSDC } from "@/lib/contracts";
import { useTheme } from "@/lib/theme";

// Syncs on-chain market data to Supabase silently
function MarketSyncer({ id }: { id: number }) {
  const { market } = useMarket(id);
  useEffect(() => {
    if (!market) return;
    recordMarketSnapshot({
      market_id: id,
      question: market.question,
      yes_pool: Number(market.yesPool) / 1e6,
      no_pool: Number(market.noPool) / 1e6,
      total_pool: Number(market.yesPool + market.noPool) / 1e6,
      participant_count: 0,
      resolved: market.resolved,
      outcome: market.resolved ? market.outcome : null,
      end_time: Number(market.endTime),
    });
  }, [market, id]);
  return null;
}

// Simple bar chart component
function BarChart({ data, dark }: { data: { label: string; value: number; color: string }[]; dark: boolean }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className={`text-xs font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
            ${d.value.toFixed(0)}
          </span>
          <div className="w-full relative" style={{ height: "64px" }}>
            <div
              className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-500 ${d.color}`}
              style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }}
            />
          </div>
          <span className={`text-xs truncate w-full text-center ${dark ? "text-gray-500" : "text-gray-400"}`}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// YES/NO ratio visual
function PoolRatio({ yes, no, dark }: { yes: number; no: number; dark: boolean }) {
  const total = yes + no;
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 50;
  const noPct = 100 - yesPct;
  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1">
        <span className="text-green-500">YES {yesPct}%</span>
        <span className={dark ? "text-red-400" : "text-red-500"}>NO {noPct}%</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
        <div className="h-full bg-green-500 rounded-full" style={{ width: `${yesPct}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsTab() {
  const { dark } = useTheme();
  const count = useMarketCount();
  const { analytics, loading } = useMarketAnalytics();

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  const main = dark ? "text-white" : "text-gray-900";
  const rowBorder = dark ? "border-gray-800" : "border-gray-100";

  // Aggregate stats
  const totalPool = analytics.reduce((s, a) => s + a.total_pool, 0);
  const totalMarkets = analytics.length;
  const resolvedMarkets = analytics.filter(a => a.resolved).length;
  const activeMarkets = totalMarkets - resolvedMarkets;

  // Chart data — top markets by pool size
  const chartData = analytics.slice(0, 6).map((a, i) => ({
    label: `M${a.market_id}`,
    value: a.total_pool,
    color: i % 2 === 0
      ? dark ? "bg-blue-600" : "bg-blue-500"
      : dark ? "bg-blue-800" : "bg-blue-300",
  }));

  return (
    <div className="space-y-4">
      {/* Sync all markets silently */}
      {Array.from({ length: count }, (_, i) => <MarketSyncer key={i} id={i} />)}

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: "Total markets", v: totalMarkets },
          { l: "Active", v: activeMarkets, c: "text-blue-500" },
          { l: "Resolved", v: resolvedMarkets, c: "text-green-500" },
          { l: "Total USDC pooled", v: `$${totalPool.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        ].map(s => (
          <div key={s.l} className={`rounded-xl border p-4 ${card}`}>
            <div className={`text-xs ${sub} mb-1`}>{s.l}</div>
            <div className={`text-xl font-bold ${(s as any).c ?? main}`}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Pool distribution chart */}
      {chartData.length > 0 && (
        <div className={`rounded-xl border p-5 ${card}`}>
          <p className={`text-xs font-bold uppercase tracking-wide mb-4 ${sub}`}>USDC Pool by Market</p>
          <BarChart data={chartData} dark={dark} />
          <p className={`text-xs mt-2 text-center ${sub}`}>Markets sorted by pool size · M0 = Market 0</p>
        </div>
      )}

      {/* Market breakdown table */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-5 py-3 border-b ${rowBorder}`}>
          <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Market Breakdown</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`h-16 rounded-lg animate-pulse ${dark ? "bg-gray-800" : "bg-gray-100"}`} />
            ))}
          </div>
        ) : analytics.length === 0 ? (
          <div className={`py-10 text-center text-sm ${sub}`}>
            No market data yet — data syncs from on-chain automatically
          </div>
        ) : (
          <div className="divide-y divide-inherit">
            {analytics.map(a => {
              const now = Math.floor(Date.now() / 1000);
              const ended = a.end_time <= now;
              const endDate = new Date(a.end_time * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <div key={a.market_id} className={`p-4 ${rowBorder} border-b last:border-0`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${main}`}>{a.question}</p>
                      <div className={`flex gap-3 text-xs mt-1 ${sub}`}>
                        <span>Market {a.market_id}</span>
                        <span>{endDate}</span>
                        <span className={`font-medium ${
                          a.resolved ? "text-green-500" :
                          ended ? "text-yellow-500" : "text-blue-500"
                        }`}>
                          {a.resolved ? `Resolved · ${a.outcome ? "YES" : "NO"} won` : ended ? "Pending" : "Live"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${main}`}>${a.total_pool.toFixed(2)}</div>
                      <div className={`text-xs ${sub}`}>total pool</div>
                    </div>
                  </div>
                  <PoolRatio yes={a.yes_pool} no={a.no_pool} dark={dark} />
                  <div className={`flex justify-between text-xs mt-1.5 ${sub}`}>
                    <span>YES ${a.yes_pool.toFixed(2)}</span>
                    <span>NO ${a.no_pool.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
