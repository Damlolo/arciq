import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id?: string;
  wallet_address: string;
  display_name: string | null;
  arciq_score: number;
  total_predictions: number;
  wins: number;
  win_rate: number;
  updated_at?: string;
}

export interface MarketAnalytic {
  id?: string;
  market_id: number;
  question: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  participant_count: number;
  resolved: boolean;
  outcome: boolean | null;
  end_time: number;
  recorded_at?: string;
}

export interface PriceHistory {
  id?: string;
  asset: string;
  price: number;
  recorded_at?: string;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function upsertLeaderboard(entry: LeaderboardEntry) {
  // If display_name is null, don't overwrite an existing name in Supabase.
  // We do this by reading the existing name first and merging.
  const { data: existing } = await supabase
    .from("leaderboard")
    .select("display_name")
    .eq("wallet_address", entry.wallet_address)
    .single();

  const mergedEntry = {
    ...entry,
    // Keep existing display_name if the incoming one is null
    display_name: entry.display_name ?? existing?.display_name ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("leaderboard")
    .upsert(mergedEntry, { onConflict: "wallet_address" });

  if (error) console.error("Supabase upsert error:", error.message);
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("arciq_score", { ascending: false })
    .limit(limit);
  if (error) console.error("Supabase fetch error:", error.message);
  return data ?? [];
}

export async function getDisplayName(wallet: string): Promise<string | null> {
  const { data } = await supabase
    .from("leaderboard")
    .select("display_name")
    .eq("wallet_address", wallet.toLowerCase())
    .single();
  return data?.display_name ?? null;
}

export async function setDisplayName(wallet: string, name: string) {
  const { error } = await supabase.from("leaderboard").upsert(
    { wallet_address: wallet.toLowerCase(), display_name: name, updated_at: new Date().toISOString() },
    { onConflict: "wallet_address" }
  );
  if (error) console.error("Set display name error:", error.message);
}

// ── Market analytics ──────────────────────────────────────────────────────────

export async function recordMarketSnapshot(analytic: MarketAnalytic) {
  const { error } = await supabase.from("market_analytics").upsert(
    { ...analytic, recorded_at: new Date().toISOString() },
    { onConflict: "market_id" }
  );
  if (error) console.error("Market analytics error:", error.message);
}

export async function getMarketAnalytics(): Promise<MarketAnalytic[]> {
  const { data, error } = await supabase
    .from("market_analytics")
    .select("*")
    .order("total_pool", { ascending: false });
  if (error) console.error("Market analytics fetch error:", error.message);
  return data ?? [];
}

// ── Price history ─────────────────────────────────────────────────────────────

export async function recordPrices(prices: Record<string, number>) {
  const rows = Object.entries(prices).map(([asset, price]) => ({
    asset: asset.toUpperCase(),
    price,
    recorded_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("price_history").insert(rows);
  if (error) console.error("Price history error:", error.message);
}

export async function getPriceHistory(asset: string, limit = 48): Promise<PriceHistory[]> {
  const { data, error } = await supabase
    .from("price_history")
    .select("*")
    .eq("asset", asset.toUpperCase())
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) console.error("Price history fetch error:", error.message);
  return (data ?? []).reverse();
}
