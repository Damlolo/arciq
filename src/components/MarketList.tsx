"use client";

import { useState } from "react";
import { useReadContract, useAccount } from "wagmi";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc, parseUsdc } from "../lib/contracts";
import { CONTRACT_ADDRESSES, PREDICTION_MARKET_ABI } from "../lib/contracts";

const MARKET_ADDR = CONTRACT_ADDRESSES.predictionMarket as `0x${string}`;

export type MarketMode = 0 | 1 | 2;

interface Market {
  question: string;
  endTime: bigint;
  resolved: boolean;
  outcome: boolean;
  yesPool: bigint;
  noPool: bigint;
  feePool: bigint;
  mode: MarketMode;
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

function calcShares(stake: bigint, pool: bigint, total: bigint): number {
  if (total === 0n || pool === 0n) return 0;
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

function formatTimeLeft(endTimeSec: number): string {
  const diff = endTimeSec * 1000 - Date.now();
  if (diff <= 0) return "Ended";
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

// ── Mini sparkline bars (decorative) ────────────────────────────────────────
function Sparkline({ yesPct }: { yesPct: number }) {
  const bars = [35, 50, 42, 65, 55, 72, 60, 80, yesPct * 0.9, yesPct];
  const max  = Math.max(...bars);
  return (
    <div className="flex items-end gap-px h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${(h / max) * 100}%`,
            background: i >= bars.length - 2
              ? "linear-gradient(180deg, #818CF8, #6366F1)"
              : "rgba(99,102,241,0.2)",
          }}
        />
      ))}
    </div>
  );
}

// ── Market Card ──────────────────────────────────────────────────────────────
function MarketCard({
  id,
  predict,
  walletAddress,
}: {
  id: bigint;
  predict: (id: bigint, yes: boolean, stake: string) => Promise<void>;
  walletAddress?: `0x${string}`;
}) {
  const { data: m }       = useMarketData(id);
  const { data: posRaw }  = useReadContract({
    address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI,
    functionName: "getPosition", args: [id, walletAddress!],
    query: { enabled: !!walletAddress },
  });
  const { data: payoutRaw } = useReadContract({
    address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI,
    functionName: "previewWinnings", args: [id, walletAddress!],
    query: { enabled: !!walletAddress },
  });

  const [side, setSide]         = useState<"yes" | "no">("yes");
  const [stakeInput, setStakeInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [txDone, setTxDone]     = useState(false);

  // Loading skeleton
  if (!m) {
    return (
      <div className="surface-card p-5 h-[270px] animate-pulse">
        <div className="flex gap-2 mb-4">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-8 ml-auto rounded" />
        </div>
        <div className="skeleton h-4 w-full rounded mb-2" />
        <div className="skeleton h-4 w-3/4 rounded mb-5" />
        <div className="skeleton h-6 w-full rounded mb-3" />
        <div className="skeleton h-8 w-full rounded-xl" />
      </div>
    );
  }

  const market = m as unknown as Market;
  const pos    = posRaw as unknown as Position | undefined;
  const payout = (payoutRaw ?? 0n) as bigint;

  const total   = market.yesPool + market.noPool;
  const yesPct  = total > 0n ? Number(market.yesPool * 10000n / total) / 100 : 50;
  const noPct   = 100 - yesPct;
  const yesPps  = calcPricePerShare(market.yesPool, total);
  const noPps   = calcPricePerShare(market.noPool, total);

  const ended    = Date.now() > Number(market.endTime) * 1000;
  const isActive = !market.resolved && !ended;
  const timeLeft = ended ? "Ended" : formatTimeLeft(Number(market.endTime));

  const hasYesPos = pos && pos.yesStake > 0n;
  const hasNoPos  = pos && pos.noStake  > 0n;
  const hasPos    = hasYesPos || hasNoPos;

  const userStake  = hasYesPos ? pos!.yesStake  : hasNoPos ? pos!.noStake  : 0n;
  const userPool   = hasYesPos ? market.yesPool : hasNoPos ? market.noPool : 0n;
  const userSide   = hasYesPos ? "YES" : "NO";
  const userShares = hasPos ? calcShares(userStake, userPool, total) : 0;
  const userPotentialPayout = hasPos ? calcPotentialPayout(userStake, userPool, total) : 0;
  const userProfit = userPotentialPayout - (hasPos ? Number(userStake) / 1e6 : 0);

  const stakeNum      = parseFloat(stakeInput) || 0;
  const activePool    = side === "yes" ? market.yesPool : market.noPool;
  const activePps     = side === "yes" ? yesPps : noPps;
  const previewShares = stakeNum > 0 && total > 0 ? stakeNum / activePps : 0;
  const previewPayout = previewShares;
  const previewProfit = previewPayout - stakeNum;
  const previewMult   = activePps > 0 ? (1 / activePps).toFixed(2) : "—";

  async function handlePredict() {
    setError("");
    if (!stakeInput || isNaN(Number(stakeInput)) || Number(stakeInput) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      await predict(id, side === "yes", stakeInput);
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

  // Status config
  const status = market.resolved
    ? { label: market.outcome ? "YES won" : "NO won", color: market.outcome ? "var(--yes-color)" : "var(--no-color)", dot: market.outcome ? "bg-emerald-400" : "bg-red-400" }
    : ended
    ? { label: "Pending resolution", color: "#F59E0B", dot: "bg-amber-400" }
    : { label: timeLeft, color: "var(--yes-color)", dot: "bg-emerald-400" };

  return (
    <div className="flex flex-col">
      {/* Main card */}
      <div
        className={`surface-card p-5 flex flex-col gap-3.5 transition-all cursor-pointer ${
          expanded ? "rounded-b-none border-b-0 border-[var(--border-accent)]" : "hover:-translate-y-0.5"
        }`}
        onClick={() => isActive && setExpanded((v) => !v)}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-[inherit]"
          style={{
            background: market.resolved ? "var(--border-subtle)"
              : ended ? "#F59E0B"
              : "linear-gradient(90deg, var(--yes-color), var(--accent-primary))"
          }} />

        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: status.color, animation: isActive ? "pulse-dot 2s infinite" : "none" }} />
            <span className="text-[11px] font-semibold" style={{ color: status.color }}>{status.label}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">#{id.toString()}</span>
        </div>

        {/* Question */}
        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 min-h-[2.6rem]">
          {market.question}
        </p>

        {/* Mini sparkline */}
        <Sparkline yesPct={yesPct} />

        {/* Probability bars */}
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="font-bold" style={{ color: "var(--yes-color)" }}>YES</span>
              <span className="font-bold text-[var(--text-primary)]">{yesPct.toFixed(0)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${yesPct}%`, background: "linear-gradient(90deg, var(--yes-color), #34D399)" }} />
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">{(yesPps * 100).toFixed(1)}¢/share</span>
          </div>
          <div className="w-px bg-[var(--border-subtle)]" />
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="font-bold" style={{ color: "var(--no-color)" }}>NO</span>
              <span className="font-bold text-[var(--text-primary)]">{noPct.toFixed(0)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${noPct}%`, background: "linear-gradient(90deg, var(--no-color), #FB7185)" }} />
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">{(noPps * 100).toFixed(1)}¢/share</span>
          </div>
        </div>

        {/* Volume row */}
        <div className="flex justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
          <span>Vol <span className="text-[var(--text-secondary)] font-semibold">${formatUsdc(total)}</span></span>
          <span>Fees <span className="text-[var(--text-secondary)] font-semibold">${formatUsdc(market.feePool)}</span></span>
        </div>

        {/* User position */}
        {hasPos && (
          <div className="rounded-xl px-3 py-2 flex items-center justify-between text-[11px]"
            style={{
              background: userSide === "YES" ? "var(--yes-glow)" : "var(--no-glow)",
              border: `1px solid ${userSide === "YES" ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.15)"}`,
            }}>
            <span className="text-[var(--text-muted)]">My position</span>
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: userSide === "YES" ? "var(--yes-color)" : "var(--no-color)" }}>{userSide}</span>
              <span className="text-[var(--text-secondary)]">{userShares.toFixed(1)} shares</span>
              <span className="font-bold" style={{ color: userProfit >= 0 ? "var(--yes-color)" : "var(--no-color)" }}>
                {userProfit >= 0 ? "+" : ""}${userProfit.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Resolved payout */}
        {market.resolved && payout > 0n && (
          <div className="rounded-xl px-3 py-2 text-[11px] text-center font-semibold"
            style={{ background: "var(--yes-glow)", color: "var(--yes-color)", border: "1px solid rgba(16,185,129,0.2)" }}>
            ${formatUsdc(payout)} claimable
          </div>
        )}

        {/* Success flash */}
        {txDone && (
          <div className="rounded-xl px-3 py-2 text-[11px] text-center font-semibold"
            style={{ background: "var(--yes-glow)", color: "var(--yes-color)", border: "1px solid rgba(16,185,129,0.2)" }}>
            ✓ Prediction placed!
          </div>
        )}

        {/* CTA */}
        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="w-full py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: expanded ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.12)",
              color: expanded ? "var(--text-secondary)" : "var(--accent-secondary)",
              border: "1px solid var(--border-default)"
            }}
          >
            {expanded ? "Close" : "Buy Shares"}
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {!isActive && !market.resolved && (
          <p className="text-[11px] text-[var(--text-muted)] text-center py-1">Market ended · awaiting resolution</p>
        )}
        {market.resolved && payout === 0n && (
          <p className="text-[11px] text-[var(--text-muted)] text-center py-1">
            Resolved · {market.outcome ? "YES" : "NO"} won
          </p>
        )}
      </div>

      {/* Expand panel */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded && isActive ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="surface-card rounded-t-none border-t-0 p-5 flex flex-col gap-3.5"
          style={{ borderColor: "var(--border-accent)" }}>

          {/* YES / NO side switcher */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
            {(["yes", "no"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className="flex-1 py-2 rounded-lg text-[12px] font-bold uppercase transition-all"
                style={side === s ? {
                  background: s === "yes" ? "linear-gradient(135deg, #059669, #10B981)" : "linear-gradient(135deg, #BE123C, #F43F5E)",
                  color: "#fff",
                  boxShadow: s === "yes" ? "0 2px 8px rgba(16,185,129,0.3)" : "0 2px 8px rgba(244,63,94,0.3)"
                } : { color: "var(--text-muted)" }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Stake input */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm font-semibold">$</span>
            <input
              type="number"
              placeholder="0.00"
              value={stakeInput}
              onChange={(e) => { setStakeInput(e.target.value); setError(""); }}
              className="premium-input pl-8 pr-16 font-bold"
              autoFocus={expanded}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] font-semibold">USDC</span>
          </div>

          {/* Live preview */}
          {stakeNum > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Shares",    val: previewShares.toFixed(2), color: "var(--text-primary)" },
                { label: "Payout",    val: `$${previewPayout.toFixed(2)}`, color: "var(--yes-color)" },
                { label: "Profit",    val: `+$${previewProfit.toFixed(2)}`, color: "var(--yes-color)" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: "var(--bg-elevated)" }}>
                  <p className="text-[10px] uppercase text-[var(--text-muted)] mb-0.5">{label}</p>
                  <p className="text-[12px] font-bold" style={{ color }}>{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Price info */}
          <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
            <span>Price/share: <span className="text-[var(--text-secondary)] font-semibold">{(activePps * 100).toFixed(1)}¢</span></span>
            <span>Max return: <span className="text-[var(--text-secondary)] font-semibold">{previewMult}×</span></span>
          </div>

          {error && (
            <p className="text-[11px] text-center font-medium" style={{ color: "var(--no-color)" }}>{error}</p>
          )}

          <button
            onClick={handlePredict}
            disabled={loading || !stakeInput}
            className={`w-full py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all ${side === "yes" ? "btn-yes" : "btn-no"}`}
          >
            {loading ? "Confirming…" : `Buy ${side.toUpperCase()} shares`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Market List ───────────────────────────────────────────────────────────────
export function MarketList() {
  const { nextMarketId, predict } = useProtocol();
  const { address: walletAddress } = useAccount();

  const ids = Array.from({ length: nextMarketId }, (_, i) => BigInt(i));

  return (
    <div className="flex flex-col gap-5">
      {/* Info banner */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-[13px]"
        style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)" }}>
        <svg className="w-4 h-4 shrink-0 text-[var(--accent-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span className="text-[var(--text-secondary)]">
          Predict correctly → ArcIQ rises → higher yield multiplier & borrow limit
        </span>
        <span className="ml-auto badge badge-blue shrink-0">{nextMarketId} markets</span>
      </div>

      {ids.length === 0 && (
        <div className="surface-card p-12 text-center">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--bg-elevated)" }}>
            <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" />
            </svg>
          </div>
          <p className="text-[var(--text-muted)] text-sm">No markets yet. Create the first one!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {ids.map((id) => (
          <MarketCard
            key={id.toString()}
            id={id}
            predict={predict}
            walletAddress={walletAddress}
          />
        ))}
      </div>
    </div>
  );
}
