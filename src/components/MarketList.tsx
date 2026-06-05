"use client";

import { useState, useMemo } from "react";
import { useReadContract, useAccount } from "wagmi";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc, parseUsdc } from "../lib/contracts";
import { CONTRACT_ADDRESSES, PREDICTION_MARKET_ABI } from "../lib/contracts";

const MARKET_ADDR = CONTRACT_ADDRESSES.predictionMarket as `0x${string}`;
const PAGE_SIZE   = 20;

export type MarketMode = 0 | 1 | 2;

interface Market {
  question: string;
  endTime:  bigint;
  resolved: boolean;
  outcome:  boolean;
  yesPool:  bigint;
  noPool:   bigint;
  feePool:  bigint;
  mode:     MarketMode;
}

interface Position {
  yesStake: bigint;
  noStake:  bigint;
  claimed:  boolean;
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
  const { data: m }         = useMarketData(id);
  const { data: posRaw }    = useReadContract({
    address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI,
    functionName: "getPosition", args: [id, walletAddress!],
    query: { enabled: !!walletAddress },
  });
  const { data: payoutRaw } = useReadContract({
    address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI,
    functionName: "previewWinnings", args: [id, walletAddress!],
    query: { enabled: !!walletAddress },
  });

  const [side, setSide]             = useState<"yes" | "no">("yes");
  const [stakeInput, setStakeInput] = useState("");
  const [expanded, setExpanded]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [txDone, setTxDone]         = useState(false);

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

  const total  = market.yesPool + market.noPool;
  const yesPct = total > 0n ? Number(market.yesPool * 10000n / total) / 100 : 50;
  const noPct  = 100 - yesPct;
  const yesPps = calcPricePerShare(market.yesPool, total);
  const noPps  = calcPricePerShare(market.noPool, total);

  const ended    = Date.now() > Number(market.endTime) * 1000;
  const isActive = !market.resolved && !ended;
  const timeLeft = ended ? "Ended" : formatTimeLeft(Number(market.endTime));

  const hasYesPos = pos && pos.yesStake > 0n;
  const hasNoPos  = pos && pos.noStake  > 0n;
  const hasPos    = hasYesPos || hasNoPos;

  const userStake           = hasYesPos ? pos!.yesStake  : hasNoPos ? pos!.noStake  : 0n;
  const userPool            = hasYesPos ? market.yesPool : hasNoPos ? market.noPool : 0n;
  const userSide            = hasYesPos ? "YES" : "NO";
  const userShares          = hasPos ? calcShares(userStake, userPool, total) : 0;
  const userPotentialPayout = hasPos ? calcPotentialPayout(userStake, userPool, total) : 0;
  const userProfit          = userPotentialPayout - (hasPos ? Number(userStake) / 1e6 : 0);

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

  const status = market.resolved
    ? { label: market.outcome ? "YES won" : "NO won", color: market.outcome ? "var(--yes-color)" : "var(--no-color)", dot: market.outcome ? "bg-emerald-400" : "bg-red-400" }
    : ended
    ? { label: "Pending resolution", color: "#F59E0B", dot: "bg-amber-400" }
    : { label: timeLeft, color: "var(--yes-color)", dot: "bg-emerald-400" };

  return (
    <div className="flex flex-col">
      <div
        className={`surface-card p-5 flex flex-col gap-3.5 transition-all cursor-pointer ${
          expanded ? "rounded-b-none border-b-0 border-[var(--border-accent)]" : "hover:-translate-y-0.5"
        }`}
        onClick={() => isActive && setExpanded((v) => !v)}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-[inherit]"
          style={{
            background: market.resolved ? "var(--border-subtle)"
              : ended ? "#F59E0B"
              : "linear-gradient(90deg, var(--yes-color), var(--accent-primary))"
          }} />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: status.color, animation: isActive ? "pulse-dot 2s infinite" : "none" }} />
            <span className="text-[11px] font-semibold" style={{ color: status.color }}>{status.label}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">#{id.toString()}</span>
        </div>

        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 min-h-[2.6rem]">
          {market.question}
        </p>

        <Sparkline yesPct={yesPct} />

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

        <div className="flex justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
          <span>Vol <span className="text-[var(--text-secondary)] font-semibold">${formatUsdc(total)}</span></span>
          <span>Fees <span className="text-[var(--text-secondary)] font-semibold">${formatUsdc(market.feePool)}</span></span>
        </div>

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

        {market.resolved && payout > 0n && (
          <div className="rounded-xl px-3 py-2 text-[11px] text-center font-semibold"
            style={{ background: "var(--yes-glow)", color: "var(--yes-color)", border: "1px solid rgba(16,185,129,0.2)" }}>
            ${formatUsdc(payout)} claimable
          </div>
        )}

        {txDone && (
          <div className="rounded-xl px-3 py-2 text-[11px] text-center font-semibold"
            style={{ background: "var(--yes-glow)", color: "var(--yes-color)", border: "1px solid rgba(16,185,129,0.2)" }}>
            ✓ Prediction placed!
          </div>
        )}

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

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded && isActive ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="surface-card rounded-t-none border-t-0 p-5 flex flex-col gap-3.5"
          style={{ borderColor: "var(--border-accent)" }}>

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

          {stakeNum > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Shares", val: previewShares.toFixed(2), color: "var(--text-primary)" },
                { label: "Payout", val: `$${previewPayout.toFixed(2)}`, color: "var(--yes-color)" },
                { label: "Profit", val: `+$${previewProfit.toFixed(2)}`, color: "var(--yes-color)" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: "var(--bg-elevated)" }}>
                  <p className="text-[10px] uppercase text-[var(--text-muted)] mb-0.5">{label}</p>
                  <p className="text-[12px] font-bold" style={{ color }}>{val}</p>
                </div>
              ))}
            </div>
          )}

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

// ── Pagination controls ───────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Show up to 5 page numbers around current
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (page > 2) pages.push("…");
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
    if (page < totalPages - 3) pages.push("…");
    pages.push(totalPages - 1);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-30"
        style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        ← Prev
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-[var(--text-muted)] text-[12px]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className="w-8 h-8 rounded-lg text-[12px] font-bold transition-all"
            style={
              p === page
                ? { background: "var(--accent-primary)", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.4)" }
                : { background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }
            }
          >
            {(p as number) + 1}
          </button>
        )
      )}

      <button
        onClick={onNext}
        disabled={page === totalPages - 1}
        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-30"
        style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        Next →
      </button>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function TabBtn({
  active,
  onClick,
  children,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count: number;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all"
      style={
        active
          ? { background: `${color}18`, color, border: `1px solid ${color}40`, boxShadow: `0 2px 12px ${color}20` }
          : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" }
      }
    >
      {children}
      <span
        className="text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[1.5rem] text-center"
        style={
          active
            ? { background: `${color}25`, color }
            : { background: "var(--bg-elevated)", color: "var(--text-muted)" }
        }
      >
        {count}
      </span>
    </button>
  );
}

// ── Market List ───────────────────────────────────────────────────────────────

// ── Static hook to read up to 300 markets (same pattern as AnalyticsTab) ─────
// Rules of hooks require a fixed number of calls — we use enabled flags to skip
function useAllMarketsData(count: number) {
  const make = (id: number) => useReadContract({  // eslint-disable-line
    address: MARKET_ADDR, abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket", args: [BigInt(id)],
    query: { enabled: id < count },
  });
  /* eslint-disable react-hooks/rules-of-hooks */
  const results = [
    make(0),make(1),make(2),make(3),make(4),make(5),make(6),make(7),make(8),make(9),
    make(10),make(11),make(12),make(13),make(14),make(15),make(16),make(17),make(18),make(19),
    make(20),make(21),make(22),make(23),make(24),make(25),make(26),make(27),make(28),make(29),
    make(30),make(31),make(32),make(33),make(34),make(35),make(36),make(37),make(38),make(39),
    make(40),make(41),make(42),make(43),make(44),make(45),make(46),make(47),make(48),make(49),
    make(50),make(51),make(52),make(53),make(54),make(55),make(56),make(57),make(58),make(59),
    make(60),make(61),make(62),make(63),make(64),make(65),make(66),make(67),make(68),make(69),
    make(70),make(71),make(72),make(73),make(74),make(75),make(76),make(77),make(78),make(79),
    make(80),make(81),make(82),make(83),make(84),make(85),make(86),make(87),make(88),make(89),
    make(90),make(91),make(92),make(93),make(94),make(95),make(96),make(97),make(98),make(99),
    make(100),make(101),make(102),make(103),make(104),make(105),make(106),make(107),make(108),make(109),
    make(110),make(111),make(112),make(113),make(114),make(115),make(116),make(117),make(118),make(119),
    make(120),make(121),make(122),make(123),make(124),make(125),make(126),make(127),make(128),make(129),
    make(130),make(131),make(132),make(133),make(134),make(135),make(136),make(137),make(138),make(139),
    make(140),make(141),make(142),make(143),make(144),make(145),make(146),make(147),make(148),make(149),
    make(150),make(151),make(152),make(153),make(154),make(155),make(156),make(157),make(158),make(159),
    make(160),make(161),make(162),make(163),make(164),make(165),make(166),make(167),make(168),make(169),
    make(170),make(171),make(172),make(173),make(174),make(175),make(176),make(177),make(178),make(179),
    make(180),make(181),make(182),make(183),make(184),make(185),make(186),make(187),make(188),make(189),
    make(190),make(191),make(192),make(193),make(194),make(195),make(196),make(197),make(198),make(199),
    make(200),make(201),make(202),make(203),make(204),make(205),make(206),make(207),make(208),make(209),
    make(210),make(211),make(212),make(213),make(214),make(215),make(216),make(217),make(218),make(219),
    make(220),make(221),make(222),make(223),make(224),make(225),make(226),make(227),make(228),make(229),
    make(230),make(231),make(232),make(233),make(234),make(235),make(236),make(237),make(238),make(239),
    make(240),make(241),make(242),make(243),make(244),make(245),make(246),make(247),make(248),make(249),
    make(250),make(251),make(252),make(253),make(254),make(255),make(256),make(257),make(258),make(259),
    make(260),make(261),make(262),make(263),make(264),make(265),make(266),make(267),make(268),make(269),
    make(270),make(271),make(272),make(273),make(274),make(275),make(276),make(277),make(278),make(279),
    make(280),make(281),make(282),make(283),make(284),make(285),make(286),make(287),make(288),make(289),
    make(290),make(291),make(292),make(293),make(294),make(295),make(296),make(297),make(298),make(299),
  ];
  /* eslint-enable react-hooks/rules-of-hooks */
  return results.slice(0, count).map((r, i) => ({
    id: BigInt(i),
    market: r.data as unknown as Market | undefined,
  }));
}

// ── Market List ───────────────────────────────────────────────────────────────
export function MarketList() {
  const { nextMarketId, predict } = useProtocol();
  const { address: walletAddress } = useAccount();

  const [tab, setTab]   = useState<"active" | "resolved">("active");
  const [page, setPage] = useState(0);

  const count = Math.min(nextMarketId, 300);
  const now   = Math.floor(Date.now() / 1000);

  // Fetch all market data upfront with static hooks
  const allMarkets = useAllMarketsData(count);

  // Split into active vs resolved — newest first
  const { activeIds, resolvedIds } = useMemo(() => {
    const active: bigint[]   = [];
    const resolved: bigint[] = [];

    // Reverse so newest (highest id) comes first
    const reversed = [...allMarkets].reverse();

    for (const { id, market } of reversed) {
      if (!market) {
        // Still loading — put in active tentatively
        active.push(id);
        continue;
      }
      if (market.resolved) {
        resolved.push(id);
      } else {
        active.push(id);
      }
    }
    return { activeIds: active, resolvedIds: resolved };
  }, [allMarkets]);

  const currentIds  = tab === "active" ? activeIds : resolvedIds;
  const totalPages  = Math.max(1, Math.ceil(currentIds.length / PAGE_SIZE));
  const pageIds     = currentIds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleTabChange(newTab: "active" | "resolved") {
    setTab(newTab);
    setPage(0);
  }

  function handlePageChange(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const loadedCount = allMarkets.filter((m) => m.market !== undefined).length;
  const allLoaded   = loadedCount >= count;

  return (
    <div className="flex flex-col gap-5">

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <TabBtn
            active={tab === "active"}
            onClick={() => handleTabChange("active")}
            count={activeIds.length}
            color="var(--yes-color)"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ animation: "pulse-dot 2s infinite" }} />
              Active
            </span>
          </TabBtn>
          <TabBtn
            active={tab === "resolved"}
            onClick={() => handleTabChange("resolved")}
            count={resolvedIds.length}
            color="#A78BFA"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Resolved
            </span>
          </TabBtn>
        </div>

        {/* Status badge */}
        <span className="badge badge-blue text-[11px]">
          {allLoaded
            ? `${nextMarketId} markets · page ${page + 1}/${totalPages}`
            : `Loading ${loadedCount}/${count}…`}
        </span>
      </div>

      {/* Info banner */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-[13px]"
        style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)" }}>
        <svg className="w-4 h-4 shrink-0 text-[var(--accent-secondary)]" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span className="text-[var(--text-secondary)]">
          {tab === "active"
            ? "Predict correctly → ArcIQ rises → higher yield multiplier & borrow limit"
            : `${resolvedIds.length} markets resolved · claim your winnings below`}
        </span>
      </div>

      {/* Empty state */}
      {nextMarketId === 0 && (
        <div className="surface-card p-12 text-center">
          <p className="text-[var(--text-muted)] text-sm">No markets yet. Create the first one!</p>
        </div>
      )}

      {/* Market grid */}
      {pageIds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {pageIds.map((id) => (
            <MarketCard
              key={id.toString()}
              id={id}
              predict={predict}
              walletAddress={walletAddress}
            />
          ))}
        </div>
      )}

      {/* Empty tab state */}
      {allLoaded && pageIds.length === 0 && nextMarketId > 0 && (
        <div className="surface-card p-12 text-center">
          <p className="text-[var(--text-muted)] text-sm">
            {tab === "resolved" ? "No resolved markets yet." : "No active markets."}
          </p>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPrev={() => handlePageChange(Math.max(0, page - 1))}
        onNext={() => handlePageChange(Math.min(totalPages - 1, page + 1))}
        onPage={handlePageChange}
      />
    </div>
  );
}
