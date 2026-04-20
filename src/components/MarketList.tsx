"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useMarketCount, useMarket, usePredict } from "@/hooks/useProtocol";
import { formatUSDC, parseUSDC } from "@/lib/contracts";
import { useTheme } from "@/lib/theme";

function MarketCard({ id, viewOnly }: { id: number; viewOnly?: boolean }) {
  const { address } = useAccount();
  const { market, position, payout, refetch } = useMarket(id);
  const { approveMarket, predict, claimWinnings, isPending } = usePredict();
  const { dark } = useTheme();

  const [side, setSide] = useState<boolean | null>(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  const txt = dark ? "text-gray-300" : "text-gray-600";
  const inp = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-white border-gray-200 text-gray-900";

  if (!market) return <div className={`h-32 rounded-xl animate-pulse ${dark ? "bg-gray-800" : "bg-gray-100"}`} />;

  const now = Math.floor(Date.now() / 1000);
  const isLive = !market.resolved && Number(market.endTime) > now;
  const isEnded = !market.resolved && Number(market.endTime) <= now;
  const totalPool = market.yesPool + market.noPool;
  const yesPct = totalPool > 0n ? Math.round(Number(market.yesPool * 100n / totalPool)) : 50;
  const noPct = 100 - yesPct;
  const hasPosition = position && (position.yesStake > 0n || position.noStake > 0n);
  const canClaim = market.resolved && payout > 0n;

  const timeLeft = () => {
    const diff = Number(market.endTime) - now;
    if (diff <= 0) return "Ended";
    const d = Math.floor(diff / 86400), h = Math.floor((diff % 86400) / 3600);
    return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
  };

  async function handlePredict() {
    if (side === null || !amount) return;
    try {
      setStatus("Approving…");
      const parsed = parseUSDC(amount);
      await approveMarket(parsed);
      setStatus("Staking…");
      await predict(id, side, parsed);
      setStatus("Staked ✓");
      setAmount(""); setSide(null); refetch();
    } catch (e: any) { setStatus("Error: " + (e?.shortMessage ?? e?.message)); }
  }

  async function handleClaim() {
    try {
      setStatus("Claiming…");
      await claimWinnings(id);
      setStatus("Claimed ✓"); refetch();
    } catch (e: any) { setStatus("Error: " + (e?.shortMessage ?? e?.message)); }
  }

  return (
    <div className={`rounded-xl border p-4 ${card}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className={`text-sm font-semibold leading-snug flex-1 ${dark ? "text-white" : "text-gray-900"}`}>{market.question}</p>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
          isLive ? "bg-green-900/40 text-green-400" : isEnded ? "bg-yellow-900/40 text-yellow-400" : market.outcome ? "bg-blue-900/40 text-blue-400" : "bg-red-900/40 text-red-400"
        }`}>{isLive ? "Live" : isEnded ? "Pending" : market.outcome ? "YES won" : "NO won"}</span>
      </div>
      <div className={`flex flex-wrap gap-3 text-xs mb-4 ${sub}`}>
        <span>⏱ {timeLeft()}</span>
        <span>💰 ${formatUSDC(totalPool)} pool</span>
        {hasPosition && <span className="text-blue-400">✓ You're in</span>}
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-xs font-medium mb-1">
          <span className="text-green-500">YES {yesPct}%</span>
          <span className="text-red-400">NO {noPct}%</span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${yesPct}%` }} />
        </div>
      </div>

      {/* View only mode — no predict form */}
      {viewOnly && isLive && (
        <p className={`text-xs ${sub}`}>Go to PREDICT to stake on this market</p>
      )}

      {!viewOnly && isLive && !hasPosition && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {([true, false] as const).map(s => (
              <button key={String(s)} onClick={() => setSide(s)}
                className={`py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  side === s
                    ? s ? "bg-green-600 border-green-600 text-white" : "bg-red-600 border-red-600 text-white"
                    : dark ? "border-gray-700 text-gray-400 hover:border-gray-500" : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>{s ? "YES ↑" : "NO ↓"}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="USDC stake" value={amount} onChange={e => setAmount(e.target.value)}
              className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inp}`} />
            <button onClick={handlePredict} disabled={isPending || side === null || !amount}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40">
              {isPending ? "…" : "Stake"}
            </button>
          </div>
          <p className={`text-xs mt-1.5 ${sub}`}>1% fee · correct predictions boost score</p>
        </>
      )}
      {!viewOnly && isLive && hasPosition && (
        <div className={`rounded-lg px-3 py-2 text-sm ${dark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-700"}`}>
          Position: {position!.yesStake > 0n ? "YES" : "NO"} · ${formatUSDC(position!.yesStake > 0n ? position!.yesStake : position!.noStake)}
        </div>
      )}
      {canClaim && (
        <button onClick={handleClaim} disabled={isPending}
          className="w-full mt-2 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
          {isPending ? "Claiming…" : `Claim $${formatUSDC(payout)}`}
        </button>
      )}
      {market.resolved && payout === 0n && hasPosition && (
        <div className={`text-sm text-center py-1 ${sub}`}>Incorrect prediction</div>
      )}
      {status && <div className={`mt-1.5 text-xs ${sub}`}>{status}</div>}
    </div>
  );
}

export function MarketList({ viewOnly }: { viewOnly?: boolean }) {
  const count = useMarketCount();
  const { dark } = useTheme();
  if (count === 0) return (
    <div className={`rounded-xl border p-8 text-center text-sm ${dark ? "bg-gray-900 border-gray-800 text-gray-500" : "bg-white border-gray-100 text-gray-400"}`}>
      No markets yet. Run the createMarkets script to add markets.
    </div>
  );
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => <MarketCard key={i} id={i} viewOnly={viewOnly} />)}
    </div>
  );
}
