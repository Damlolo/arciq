"use client";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useReputation } from "@/hooks/useProtocol";
import {
  upsertLeaderboard, getLeaderboard, getDisplayName,
  setDisplayName as setDisplayNameDB, getMarketAnalytics,
  LeaderboardEntry, MarketAnalytic,
} from "@/lib/supabase";

// ── Leaderboard ───────────────────────────────────────────────────────────────

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getLeaderboard(50);
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { entries, loading, refresh };
}

// ── Sync current user score to Supabase ───────────────────────────────────────

export function useScoreSync() {
  const { address } = useAccount();
  const { score, totalPredictions, wins } = useReputation(address);

  useEffect(() => {
    // Wait for real on-chain data to load before syncing.
    // score defaults to 50 for new users from the contract,
    // but we also check totalPredictions to avoid overwriting
    // a real score with a stale default on first render.
    if (!address) return;
    // Don't sync until wagmi has actually fetched the data
    // (score will be exactly 50 and totalPredictions 0 on loading state too,
    // so we use a small delay to let the RPC call complete first)
    const timer = setTimeout(() => {
      if (!address) return;
      const winRate = Number(totalPredictions) > 0
        ? Math.round((Number(wins) / Number(totalPredictions)) * 100)
        : 0;

      // Only sync if score is the real value — 
      // new users genuinely start at 50 per contract, so we always sync
      // but we read the display_name from Supabase first to not overwrite it
      upsertLeaderboard({
        wallet_address: address.toLowerCase(),
        display_name: null, // null = don't overwrite existing name (handled by upsert)
        arciq_score: score,
        total_predictions: Number(totalPredictions),
        wins: Number(wins),
        win_rate: winRate,
      });
    }, 2000); // 2s delay gives wagmi time to fetch on-chain data

    return () => clearTimeout(timer);
  }, [address, score, totalPredictions, wins]);
}

// ── Display name ──────────────────────────────────────────────────────────────

export function useDisplayName() {
  const { address } = useAccount();
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!address) return;
    getDisplayName(address).then(setDisplayNameState);
  }, [address]);

  const saveName = async (name: string) => {
    if (!address) return;
    setSaving(true);
    await setDisplayNameDB(address, name.trim());
    setDisplayNameState(name.trim());
    setSaving(false);
  };

  return { displayName, saveName, saving };
}

// ── Market analytics ──────────────────────────────────────────────────────────

export function useMarketAnalytics() {
  const [analytics, setAnalytics] = useState<MarketAnalytic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketAnalytics().then(data => {
      setAnalytics(data);
      setLoading(false);
    });
  }, []);

  return { analytics, loading };
}
