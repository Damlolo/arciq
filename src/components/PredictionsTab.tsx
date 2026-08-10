"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { useAccount, useWriteContract } from "@/lib/circleWallet";
import { useProtocol } from "@/hooks/useProtocol";
import {
  CONTRACT_ADDRESSES,
  PREDICTION_MARKET_ABI,
  REPUTATION_ENGINE_ABI,
  formatUsdc,
} from "@/lib/contracts";

const MARKET_ADDR = CONTRACT_ADDRESSES.predictionMarket as `0x${string}`;
const REP_ADDR    = CONTRACT_ADDRESSES.reputationEngine  as `0x${string}`;

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

// ─── Invisible data collector ──────────────────────────────────────────────
function MarketDataCollector({ id, address, onData }: {
  id: number; address: `0x${string}`;
  onData: (id: number, entry: PredictionEntry | null) => void;
}) {
  const { data: market }   = useReadContract({ address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI, functionName: "getMarket",      args: [BigInt(id)] });
  const { data: position } = useReadContract({ address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI, functionName: "getPosition",    args: [BigInt(id), address] });
  const { data: payout }   = useReadContract({ address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI, functionName: "previewWinnings", args: [BigInt(id), address] });

  useEffect(() => {
    if (!market || !position) return;
    const m = market as any; const p = position as any;
    if (p.yesStake === 0n && p.noStake === 0n) { onData(id, null); return; }
    const side      = p.yesStake > 0n ? "YES" : "NO" as "YES" | "NO";
    const stake     = p.yesStake > 0n ? p.yesStake : p.noStake;
    const payoutVal = (payout ?? 0n) as bigint;
    const now       = Math.floor(Date.now() / 1000);
    let s: PredictionStatus = "active";
    if (m.resolved) {
      const won = m.outcome ? p.yesStake > 0n : p.noStake > 0n;
      s = won && payoutVal > 0n ? "claimable" : won ? "won" : "lost";
    } else if (Number(m.endTime) <= now) { s = "pending"; }
    onData(id, { marketId: id, question: m.question, side, stake, status: s, payout: payoutVal, endTime: Number(m.endTime), resolved: m.resolved, outcome: m.outcome });
  }, [market, position, payout]);

  return null;
}

// ─── Badge config ──────────────────────────────────────────────────────────
function statusStyle(s: PredictionStatus) {
  switch (s) {
    case "active":    return { label: "Active",          bg: "rgba(99,102,241,0.1)",   color: "#818CF8", border: "rgba(99,102,241,0.2)"   };
    case "won":       return { label: "Won",             bg: "rgba(16,185,129,0.1)",   color: "#10B981", border: "rgba(16,185,129,0.2)"   };
    case "claimable": return { label: "Claim",           bg: "rgba(16,185,129,0.12)",  color: "#10B981", border: "rgba(16,185,129,0.25)"  };
    case "lost":      return { label: "Lost",            bg: "rgba(244,63,94,0.08)",   color: "#F43F5E", border: "rgba(244,63,94,0.2)"    };
    case "pending":   return { label: "Awaiting result", bg: "rgba(245,158,11,0.08)",  color: "#F59E0B", border: "rgba(245,158,11,0.2)"   };
  }
}

// ─── Single prediction row ─────────────────────────────────────────────────
function PredictionRow({ id, address }: { id: number; address: `0x${string}` }) {
  const { data: market }   = useReadContract({ address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI, functionName: "getMarket",      args: [BigInt(id)] });
  const { data: position } = useReadContract({ address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI, functionName: "getPosition",    args: [BigInt(id), address] });
  const { data: payout }   = useReadContract({ address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI, functionName: "previewWinnings", args: [BigInt(id), address] });
  const { writeContractAsync, isPending } = useWriteContract();
  const [txStatus, setTxStatus] = useState("");

  if (!market || !position) {
    return <div className="skeleton h-[90px] rounded-xl" />;
  }

  const m = market as any; const p = position as any;
  if (p.yesStake === 0n && p.noStake === 0n) return null;

  const side      = p.yesStake > 0n ? "YES" : "NO";
  const stake     = p.yesStake > 0n ? p.yesStake : p.noStake;
  const payoutVal = (payout ?? 0n) as bigint;
  const now       = Math.floor(Date.now() / 1000);
  const diff      = Number(m.endTime) - now;
  const timeLeft  = diff <= 0 ? "Ended" : diff > 86400 ? `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h` : `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;

  let status: PredictionStatus = "active";
  if (m.resolved) {
    const won = m.outcome ? p.yesStake > 0n : p.noStake > 0n;
    status = won && payoutVal > 0n ? "claimable" : won ? "won" : "lost";
  } else if (Number(m.endTime) <= now) { status = "pending"; }

  const st = statusStyle(status);

  async function handleClaim() {
    try {
      setTxStatus("Claiming…");
      await writeContractAsync({ address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI, functionName: "claimWinnings", args: [BigInt(id)] });
      setTxStatus("Claimed ✓");
    } catch (e: any) { setTxStatus(e?.shortMessage ?? "Failed"); }
  }

  return (
    <div className="surface-card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug flex-1 line-clamp-2">{m.question}</p>
        <span className="shrink-0 text-[11px] px-2.5 py-1 rounded-full font-bold border"
          style={{ background: st.bg, color: st.color, borderColor: st.border }}>
          {st.label}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-[12px]">
        <span className="font-bold" style={{ color: side === "YES" ? "var(--yes-color)" : "var(--no-color)" }}>{side}</span>
        <span className="text-[var(--text-muted)]">Staked <span className="text-[var(--text-secondary)] font-semibold">${formatUsdc(stake)}</span></span>
        <span className="text-[var(--text-muted)] ml-auto">{timeLeft}</span>
      </div>

      {/* Resolved footer */}
      {(m.resolved || Number(m.endTime) <= now) && (
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <p className="text-[12px] text-[var(--text-muted)]">
            {m.resolved ? (
              <>Settled: <span className="font-semibold text-[var(--text-primary)]">{m.outcome ? "YES" : "NO"} won</span>
                {payoutVal > 0n && <span className="ml-2 font-bold" style={{ color: "var(--yes-color)" }}>+${formatUsdc(payoutVal)}</span>}
              </>
            ) : "Market ended — awaiting resolution"}
          </p>
          {m.resolved && payoutVal > 0n && (
            <button onClick={handleClaim} disabled={isPending}
              className="btn-yes text-[12px] px-4 py-1.5 disabled:opacity-50">
              {isPending ? "…" : "Claim"}
            </button>
          )}
        </div>
      )}
      {txStatus && <p className="text-[11px] text-[var(--text-muted)]">{txStatus}</p>}
    </div>
  );
}

type FilterTab = "OPEN" | "CLOSED" | "WON" | "LOST";

// ─── Main tab ──────────────────────────────────────────────────────────────
export function PredictionsTab() {
  const { address }                    = useAccount();
  const { nextMarketId, score }        = useProtocol();
  const [entries, setEntries]          = useState<Map<number, PredictionEntry | null>>(new Map());
  const [filter, setFilter]            = useState<FilterTab>("OPEN");

  const handleData = (id: number, e: PredictionEntry | null) =>
    setEntries(prev => new Map(prev).set(id, e));

  const all       = Array.from(entries.values()).filter(Boolean) as PredictionEntry[];
  const open      = all.filter(p => p.status === "active");
  const closed    = all.filter(p => ["pending","won","lost","claimable"].includes(p.status));
  const won       = all.filter(p => p.status === "won" || p.status === "claimable");
  const lost      = all.filter(p => p.status === "lost");
  const claimable = all.filter(p => p.status === "claimable");
  const totalClaimable = claimable.reduce((s, p) => s + p.payout, 0n);
  const accuracy  = all.length > 0 ? Math.round((won.length / all.length) * 100) : 0;

  const filterMap: Record<FilterTab, PredictionEntry[]> = { OPEN: open, CLOSED: closed, WON: won, LOST: lost };
  const filtered  = filterMap[filter];
  const filterTabs: { id: FilterTab; count: number }[] = [
    { id: "OPEN",   count: open.length   },
    { id: "CLOSED", count: closed.length },
    { id: "WON",    count: won.length    },
    { id: "LOST",   count: lost.length   },
  ];

  if (!address) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="text-[var(--text-muted)] text-sm">Connect your wallet to view your predictions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invisible collectors */}
      {Array.from({ length: nextMarketId }, (_, i) => (
        <MarketDataCollector key={i} id={i} address={address as `0x${string}`} onData={handleData} />
      ))}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: "Total", v: all.length,  color: "var(--text-primary)"    },
          { l: "Open",  v: open.length, color: "var(--accent-secondary)" },
          { l: "Won",   v: won.length,  color: "var(--yes-color)"        },
          { l: "Lost",  v: lost.length, color: "var(--no-color)"         },
        ].map(s => (
          <div key={s.l} className="stat-card text-center">
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.v}</div>
            <div className="text-[11px] mt-0.5 text-[var(--text-muted)]">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Claimable banner */}
      {claimable.length > 0 && (
        <div className="rounded-xl px-4 py-3.5 flex items-center justify-between"
          style={{ background: "var(--yes-glow)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div>
            <p className="text-[13px] font-bold text-[var(--text-primary)]">
              {claimable.length} prediction{claimable.length > 1 ? "s" : ""} ready to claim
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">${formatUsdc(totalClaimable)} USDC available</p>
          </div>
          <svg className="w-5 h-5 text-[var(--yes-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}

      {/* Score progress */}
      <div className="surface-card p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">ArcIQ Progress</p>
          <span className="text-[13px] font-black" style={{ color: "var(--accent-secondary)" }}>{score} / 100</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{
            width: `${score}%`,
            background: score >= 90 ? "linear-gradient(90deg, #A78BFA, #818CF8)"
              : score >= 70 ? "linear-gradient(90deg, #38BDF8, #818CF8)"
              : "linear-gradient(90deg, #6366F1, #818CF8)"
          }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>{all.length} predictions tracked</span>
          <span>{won.length} correct</span>
          <span style={{ color: accuracy >= 60 ? "var(--yes-color)" : accuracy >= 40 ? "#F59E0B" : "var(--no-color)" }}>
            {accuracy}% accuracy
          </span>
        </div>

        {/* Mini history bars */}
        {all.length > 0 && (
          <div className="flex gap-0.5 items-end h-6 mt-1">
            {all.slice(-30).map((p, i) => (
              <div key={i} className="flex-1 rounded-sm transition-all"
                style={{
                  height: p.status === "won" || p.status === "claimable" ? "100%"
                    : p.status === "lost" ? "50%" : "70%",
                  background: p.status === "won" || p.status === "claimable"
                    ? "var(--yes-color)"
                    : p.status === "lost"
                    ? "var(--no-color)"
                    : "var(--border-strong)"
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filter + list */}
      <div className="surface-card overflow-hidden">
        {/* Filter tabs */}
        <div className="flex border-b border-[var(--border-subtle)]">
          {filterTabs.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2"
              style={filter === f.id ? {
                color: "var(--accent-secondary)",
                borderColor: "var(--accent-primary)"
              } : {
                color: "var(--text-muted)",
                borderColor: "transparent"
              }}>
              {f.id}{f.count > 0 ? ` · ${f.count}` : ""}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="p-3 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                {filter === "OPEN" ? "No open predictions" : filter === "CLOSED" ? "No closed predictions" : filter === "WON" ? "No wins yet" : "No losses yet"}
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">
                {filter === "OPEN" ? "Go to Markets to stake on a prediction" : "Predictions appear here once markets close"}
              </p>
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
