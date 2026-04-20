"use client";
import { useAccount } from "wagmi";
import { useReputation } from "@/hooks/useProtocol";
import { scoreToMultiplier, scoreTier } from "@/lib/contracts";
import { useTheme } from "@/lib/theme";

export function ScoreCard() {
  const { address } = useAccount();
  const { score, totalPredictions, wins } = useReputation(address);
  const { dark } = useTheme();

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const label = dark ? "text-gray-400" : "text-gray-400";
  const tiers = ["1.0×","1.1×","1.2×","1.3×","1.4×"];
  const currentTier = scoreTier(score);

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <div className={`text-xs font-medium uppercase tracking-wide mb-3 ${label}`}>ArcIQ Score</div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className={`text-3xl font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{score}</span>
        <span className={`text-sm ${label}`}>/ 100</span>
        <span className="ml-auto text-sm font-medium text-blue-500">{scoreToMultiplier(score)} LTV</span>
      </div>
      <div className={`h-2 rounded-full mb-4 overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${score}%` }} />
      </div>
      <div className="flex gap-1">
        {tiers.map((t, i) => (
          <div key={t} className={`flex-1 text-center py-1 rounded text-xs font-medium transition-all ${
            i + 1 === currentTier
              ? "bg-blue-600 text-white"
              : dark ? "text-gray-600" : "text-gray-400"
          }`}>{t}</div>
        ))}
      </div>
      <div className={`mt-3 text-xs ${label}`}>
        {Number(totalPredictions)} predictions · {Number(wins)} wins
        {Number(totalPredictions) > 0 && (
          <span className="ml-1 text-green-500 font-medium">
            ({Math.round((Number(wins) / Number(totalPredictions)) * 100)}% win rate)
          </span>
        )}
      </div>
    </div>
  );
}
