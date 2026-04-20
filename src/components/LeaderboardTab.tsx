"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useLeaderboard, useDisplayName, useScoreSync } from "@/hooks/useSupabase";
import { useReputation } from "@/hooks/useProtocol";
import { scoreToMultiplier, scoreTier } from "@/lib/contracts";
import { useTheme } from "@/lib/theme";

function TierBadge({ score, dark }: { score: number; dark: boolean }) {
  const tier = scoreTier(score);
  const labels = ["—", "Novice", "Apprentice", "Analyst", "Expert", "Oracle"];
  const colors = [
    "",
    dark ? "text-gray-400" : "text-gray-500",
    dark ? "text-blue-400" : "text-blue-600",
    dark ? "text-green-400" : "text-green-600",
    dark ? "text-purple-400" : "text-purple-600",
    dark ? "text-yellow-400" : "text-yellow-500",
  ];
  return <span className={`text-xs font-medium ${colors[tier]}`}>{labels[tier]}</span>;
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-sm font-bold text-yellow-500">1</span>;
  if (rank === 2) return <span className="text-sm font-bold text-gray-400">2</span>;
  if (rank === 3) return <span className="text-sm font-bold text-orange-500">3</span>;
  return <span className="text-sm text-gray-500">{rank}</span>;
}

export function LeaderboardTab() {
  const { address } = useAccount();
  const { dark } = useTheme();
  const { entries, loading, refresh } = useLeaderboard();
  const { displayName, saveName, saving } = useDisplayName();
  const { score } = useReputation(address);

  // Sync current user score on mount
  useScoreSync();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  const main = dark ? "text-white" : "text-gray-900";
  const inp = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400";
  const rowBorder = dark ? "border-gray-800" : "border-gray-100";
  const rowHover = dark ? "hover:bg-gray-800/50" : "hover:bg-gray-50";

  // Find current user's rank
  const myRank = entries.findIndex(e => e.wallet_address === address?.toLowerCase()) + 1;

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    await saveName(nameInput);
    setEditingName(false);
    setNameInput("");
    refresh();
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="space-y-4">

      {/* Your rank card */}
      {address && (
        <div className={`rounded-xl border p-5 ${card}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(displayName ?? address).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${main}`}>
                    {displayName ?? formatAddress(address)}
                  </span>
                  <button
                    onClick={() => { setEditingName(true); setNameInput(displayName ?? ""); }}
                    className={`text-xs ${sub} hover:text-blue-500 transition-colors`}
                  >
                    {displayName ? "Edit" : "Set name"}
                  </button>
                </div>
                <div className={`text-xs mt-0.5 ${sub}`}>
                  {myRank > 0 ? `Rank #${myRank}` : "Sync in progress..."} · On-chain score: {score}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${main}`}>{score}</div>
              <div className={`text-xs ${sub}`}>{scoreToMultiplier(score)} LTV · live</div>
            </div>
          </div>

          {/* Display name editor */}
          {editingName && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Enter display name"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={24}
                className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inp}`}
              />
              <button
                onClick={handleSaveName}
                disabled={saving || !nameInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                {saving ? "..." : "Save"}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className={`px-4 py-2 text-sm rounded-lg ${dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard table */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-5 py-3 border-b flex items-center justify-between ${rowBorder}`}>
          <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Top Forecasters</p>
          <button
            onClick={refresh}
            className={`text-xs ${sub} hover:text-blue-500 transition-colors`}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={`h-14 animate-pulse mx-4 my-2 rounded-lg ${dark ? "bg-gray-800" : "bg-gray-100"}`} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className={`py-12 text-center text-sm ${sub}`}>
            <div className={`font-medium mb-1 ${main}`}>No entries yet</div>
            <div>Be the first — make a prediction to appear here</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={`grid grid-cols-12 gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wide border-b ${sub} ${rowBorder} ${dark ? "bg-gray-800/50" : "bg-gray-50"}`}>
              <div className="col-span-1">#</div>
              <div className="col-span-4">Forecaster</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-2 text-center">Tier</div>
              <div className="col-span-2 text-center">Win rate</div>
              <div className="col-span-1 text-center">Wins</div>
            </div>

            {/* Rows */}
            {entries.map((entry, idx) => {
              const isMe = entry.wallet_address === address?.toLowerCase();
              return (
                <div
                  key={entry.wallet_address}
                  className={`grid grid-cols-12 gap-2 px-5 py-3 items-center border-b last:border-0 transition-colors ${rowBorder} ${rowHover} ${isMe ? dark ? "bg-blue-900/20" : "bg-blue-50" : ""}`}
                >
                  <div className="col-span-1">
                    <RankMedal rank={idx + 1} />
                  </div>
                  <div className="col-span-4 min-w-0">
                    <div className={`text-sm font-medium truncate ${main}`}>
                      {entry.display_name ?? formatAddress(entry.wallet_address)}
                      {isMe && <span className="ml-1.5 text-xs text-blue-500 font-normal">you</span>}
                    </div>
                    {entry.display_name && (
                      <div className={`text-xs truncate ${sub}`}>{formatAddress(entry.wallet_address)}</div>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`text-sm font-bold ${main}`}>{entry.arciq_score}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <TierBadge score={entry.arciq_score} dark={dark} />
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`text-sm font-medium ${entry.win_rate >= 60 ? "text-green-500" : main}`}>
                      {entry.win_rate}%
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={`text-sm ${main}`}>{entry.wins}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Tier guide */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Score Tiers</p>
        <div className="space-y-2">
          {[
            { tier: "Oracle", range: "90–100", mult: "1.4×", color: dark ? "text-yellow-400" : "text-yellow-600" },
            { tier: "Expert", range: "80–89", mult: "1.3×", color: dark ? "text-purple-400" : "text-purple-600" },
            { tier: "Analyst", range: "70–79", mult: "1.2×", color: dark ? "text-green-400" : "text-green-600" },
            { tier: "Apprentice", range: "60–69", mult: "1.1×", color: dark ? "text-blue-400" : "text-blue-600" },
            { tier: "Novice", range: "50–59", mult: "1.0×", color: dark ? "text-gray-400" : "text-gray-500" },
          ].map(t => (
            <div key={t.tier} className="flex items-center justify-between text-sm">
              <span className={`font-medium ${t.color}`}>{t.tier}</span>
              <span className={sub}>{t.range}</span>
              <span className={`font-medium ${main}`}>{t.mult} LTV</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
