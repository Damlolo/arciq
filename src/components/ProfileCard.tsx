"use client";
import { useAccount } from "wagmi";
import { useReputation, useLoanData } from "@/hooks/useProtocol";
import { formatUSDC, scoreToMultiplier, scoreTier } from "@/lib/contracts";
import { useTheme } from "@/app/page";

export function ProfileCard() {
  const { address } = useAccount();
  const { score, totalPredictions, wins } = useReputation(address);
  const { principal } = useLoanData();
  const { dark } = useTheme();

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  const txt = dark ? "text-gray-300" : "text-gray-600";
  const main = dark ? "text-white" : "text-gray-900";
  const rowBorder = dark ? "border-gray-800" : "border-gray-50";

  const losses = Number(totalPredictions) - Number(wins);
  const winRate = Number(totalPredictions) > 0 ? Math.round((Number(wins) / Number(totalPredictions)) * 100) : 0;
  const tierLabel = ["—","Novice","Apprentice","Analyst","Expert","Oracle"][scoreTier(score)];
  const bars = [...Array(Number(wins)).fill(true), ...Array(losses).fill(false)].slice(-16);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            {address?.slice(2, 4).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-bold truncate ${main}`}>{address?.slice(0,6)}…{address?.slice(-4)}</div>
            <div className="text-sm text-blue-500 font-medium">{tierLabel} · Score {score}</div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${main}`}>{scoreToMultiplier(score)}</div>
            <div className={`text-xs ${sub}`}>LTV boost</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Predictions", v: Number(totalPredictions), c: main },
            { l: "Wins", v: Number(wins), c: "text-green-500" },
            { l: "Win rate", v: `${winRate}%`, c: winRate >= 60 ? "text-green-500" : main },
          ].map(s => (
            <div key={s.l} className={`text-center rounded-lg py-3 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
              <div className={`text-xs ${sub}`}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* History bars */}
      {bars.length > 0 && (
        <div className={`rounded-xl border p-5 ${card}`}>
          <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Prediction history</p>
          <div className="flex gap-1 items-end h-8">
            {bars.map((win, i) => (
              <div key={i} className={`flex-1 rounded-sm ${win ? "bg-green-500" : "bg-red-400"}`}
                style={{ height: win ? "100%" : "50%" }} />
            ))}
          </div>
          <div className={`flex gap-4 mt-2 text-xs ${sub}`}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm inline-block" />Won</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-sm inline-block" />Lost</span>
          </div>
        </div>
      )}

      {/* Account details */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Account Details</p>
        <div className="space-y-0">
          {[
            { l: "Wallet", v: `${address?.slice(0,6)}…${address?.slice(-4)}` },
            { l: "Borrowing tier", v: `${tierLabel} (Score ${score})` },
            { l: "LTV multiplier", v: scoreToMultiplier(score) },
            { l: "Active debt", v: principal > 0n ? `$${formatUSDC(principal)}` : "None" },
          ].map(r => (
            <div key={r.l} className={`flex justify-between py-2.5 border-b last:border-0 text-sm ${rowBorder}`}>
              <span className={sub}>{r.l}</span>
              <span className={`font-semibold ${main}`}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Protocol Revenue Streams</p>
        <div className="space-y-0">
          {[
            { l: "Borrow interest", v: "5% APR" },
            { l: "Prediction fee", v: "1% per stake" },
            { l: "Liquidation penalty", v: "5% of collateral" },
          ].map(r => (
            <div key={r.l} className={`flex justify-between py-2.5 border-b last:border-0 text-sm ${rowBorder}`}>
              <span className={sub}>{r.l}</span>
              <span className={`font-semibold ${main}`}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
