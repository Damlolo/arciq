"use client";

import { useProtocol } from "../hooks/useProtocol";
import { yieldMultiplierLabel, ltvLabel } from "../lib/contracts";

export function ScoreCard() {
  const { score, yieldMultiplier, ltvPct, isElite, eliteBonusPool } = useProtocol();
  const { formatUsdc } = require("../lib/contracts");

  const ring = score >= 90 ? "#a78bfa" : score >= 70 ? "#34d399" : score >= 50 ? "#60a5fa" : "#f87171";
  const circumference = 2 * Math.PI * 44;
  const progress = (score / 100) * circumference;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">ArcIQ Score</h2>
        {isElite && (
          <span className="text-xs font-bold text-violet-400 bg-violet-400/10 border border-violet-400/20 px-2 py-0.5 rounded-full">
            ⚡ Elite
          </span>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Circular progress */}
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#1f2937" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke={ring} strokeWidth="8"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{score}</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-2 flex-1">
          <StatRow label="Yield multiplier" value={yieldMultiplierLabel(score)} highlight />
          <StatRow label="Max LTV" value={ltvLabel(score)} />
          <StatRow label="Tier" value={
            score >= 90 ? "Elite" : score >= 70 ? "Advanced" : score >= 50 ? "Standard" : "Beginner"
          } />
        </div>
      </div>

      {/* Score bar legend */}
      <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
        <div className="flex-1 bg-red-500/50" />
        <div className="flex-1 bg-blue-500/50" />
        <div className="flex-1 bg-emerald-500/50" />
        <div className="flex-1 bg-violet-500/50" />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>0 – Beginner</span>
        <span>50 – Standard</span>
        <span>70 – Advanced</span>
        <span>90 – Elite</span>
      </div>

      {isElite && eliteBonusPool > 0n && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-sm text-violet-300">
          🎁 Elite bonus pool: <span className="font-semibold">${formatUsdc(eliteBonusPool)} USDC</span> available to claim
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-emerald-400" : "text-white"}`}>{value}</span>
    </div>
  );
}
