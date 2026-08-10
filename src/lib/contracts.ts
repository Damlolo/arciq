// ─── Contract addresses ───────────────────────────────────────────────────────
// Update vault, yieldRouter, and usycAdapter after running deploy-v2-upgrades.ts
// Leave usycAdapter as null until deployment is complete.

export const CONTRACT_ADDRESSES = {
  usdc:             "0x3600000000000000000000000000000000000000",
  reputationEngine: "0xa67e9f3922ce7E5c72779795823249803A73C817",
  vault:            "0x25C0a05fE44e26C4b9d955bF246853A8A878FF6e", // ← replace with Vault v2 address after deploy
  yieldRouter:      "0x630B1e4d7668cC456094b02aB7C2a0469996f4aA", // ← replace with YieldRouter v2 address after deploy
  predictionMarket: "0xe3B1Bb03B807d50a5C70682d8b7fD286783576D6",
  lendingEngine:    "0x72aaa405E4E0C73AD76B3C818647cd1a72886F69",

  // Set this after deploying USYCYieldAdapter and receiving USYC allowlist approval.
  // While null, "Deploy idle USDC" button is disabled and the yield source
  // stream shows "Coming soon" messaging.
  usycAdapter:      null as string | null,

  // Arc Testnet USYC token (for balance display)
  usyc:             "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
};

// ─── Arc Testnet chain config ─────────────────────────────────────────────────

// Set NEXT_PUBLIC_ARC_RPC_URL to a dedicated RPC endpoint (QuickNode, Alchemy,
// dRPC, etc.) once you have one — Arc's public endpoint is rate-limited hard
// enough that it can't reliably serve a dApp reading hundreds of markets.
const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";

export const ARC_TESTNET = {
  id: 5042002,
  name: "Arc Testnet",
  network: "arcTestnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: [ARC_RPC_URL] },
    public:  { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
} as const;

// ─── ABIs (object format required by wagmi v2 / viem) ────────────────────────

// VAULT v2 ABI
// Key changes from v1:
//   - "yieldAccrued" removed — replaced by "earned" and "earnedWithMultiplier"
//   - "totalFreeBalance" added (used by YieldKeeper and deploy threshold logic)
//   - "totalEliteDeposits" added (O(1) elite pool tracking)
//   - "rewardPerTokenStored" added (useful for frontend progress / debug)
export const VAULT_ABI = [
  // Write
  { name: "deposit",               type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount",  type: "uint256" }], outputs: [] },
  { name: "withdraw",              type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount",  type: "uint256" }], outputs: [] },
  { name: "claimYield",            type: "function", stateMutability: "nonpayable", inputs: [],                                     outputs: [] },
  // Read — user
  { name: "deposits",              type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "lockedCollateral",      type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "freeBalance",           type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  // v2: replaces "yieldAccrued" — raw base yield before multiplier
  { name: "earned",                type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  // v2: yield after applying the user's current reputation multiplier — use this for display
  { name: "earnedWithMultiplier",  type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  // Read — global
  { name: "totalDeposits",         type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalLocked",           type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // v2: free balance across all depositors (totalDeposits - totalLocked)
  { name: "totalFreeBalance",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalYieldDistributed", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // v2: running total of deposits from elite users (score >= 90) — O(1)
  { name: "totalEliteDeposits",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // v2: monotonically increasing accumulator — useful for debug / progress bars
  { name: "rewardPerTokenStored",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

// YIELD ROUTER v2 ABI
// Key changes from v1:
//   - "totalLiquidationFeesCollected" renamed to "totalLiquidationFeesReceived"
//     (matches the actual v2 contract storage variable name)
//   - "secondsUntilNextDistribution" added — use for countdown timer display
export const YIELD_ROUTER_ABI = [
  // Write
  { name: "deployToSource",  type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "distribute",      type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "seedYield",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "claimEliteBonus", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  // Read — live state
  { name: "pendingTotal",                   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "eliteBonusPool",                 type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "estimatedApy",                   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "pendingUsdcToVault",             type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "lastDistributionTimestamp",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // v2: seconds until distribute() is callable again — 0 means callable now
  { name: "secondsUntilNextDistribution",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "deployedToSource",               type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // Read — lifetime totals
  { name: "totalDistributedToVault",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalDistributedToTreasury",     type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalBorrowInterestReceived",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // FIXED: was "totalLiquidationFeesCollected" in v1 — actual contract var is "totalLiquidationFeesReceived"
  { name: "totalLiquidationFeesReceived",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalPredictionFeesReceived",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalExternalYieldHarvested",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // Read — pending breakdown (useful for analytics)
  { name: "pendingBorrowInterest",          type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "pendingLiquidationFees",         type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "pendingPredictionFees",          type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

// USYC ADAPTER ABI (read-only — the frontend only needs to display stats)
export const USYC_ADAPTER_ABI = [
  { name: "totalDeposited",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "usycPrincipalShares", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "pendingYield",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "apyBps",              type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const REPUTATION_ENGINE_ABI = [
  { name: "getScore",        type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "yieldMultiplier", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "ltvMultiplier",   type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "isElite",         type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "bool"    }] },
  { name: "hasScore",        type: "function", stateMutability: "view", inputs: [{ name: "",     type: "address" }], outputs: [{ type: "bool"    }] },
] as const;

export const PREDICTION_MARKET_ABI = [
  { name: "nextMarketId",     type: "function", stateMutability: "view",       inputs: [],                                                                              outputs: [{ type: "uint256" }] },
  { name: "predict",          type: "function", stateMutability: "nonpayable", inputs: [{ name: "marketId", type: "uint256" }, { name: "yes", type: "bool" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "claimWinnings",    type: "function", stateMutability: "nonpayable", inputs: [{ name: "marketId", type: "uint256" }],                                        outputs: [] },
  { name: "updateReputation", type: "function", stateMutability: "nonpayable", inputs: [{ name: "marketId", type: "uint256" }, { name: "user", type: "address" }],     outputs: [] },
  { name: "previewWinnings",  type: "function", stateMutability: "view",       inputs: [{ name: "id",       type: "uint256" }, { name: "user", type: "address" }],     outputs: [{ type: "uint256" }] },
  {
    name: "getMarket", type: "function", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "tuple", components: [
      { name: "question", type: "string"  },
      { name: "endTime",  type: "uint256" },
      { name: "resolved", type: "bool"    },
      { name: "outcome",  type: "bool"    },
      { name: "yesPool",  type: "uint256" },
      { name: "noPool",   type: "uint256" },
      { name: "feePool",  type: "uint256" },
      { name: "mode",     type: "uint8"    },
    ]}],
  },
  {
    name: "getPosition", type: "function", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }, { name: "user", type: "address" }],
    outputs: [{ type: "tuple", components: [
      { name: "yesStake", type: "uint256" },
      { name: "noStake",  type: "uint256" },
      { name: "claimed",  type: "bool"    },
    ]}],
  },
] as const;

export const LENDING_ENGINE_ABI = [
  { name: "borrow",          type: "function", stateMutability: "nonpayable", inputs: [{ name: "collateralAmount", type: "uint256" }, { name: "borrowAmount", type: "uint256" }], outputs: [] },
  { name: "repay",           type: "function", stateMutability: "nonpayable", inputs: [],                                                                                         outputs: [] },
  { name: "liquidate",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "borrower", type: "address" }],                                                   outputs: [] },
  { name: "borrowLimit",     type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }, { name: "collateral", type: "uint256" }],              outputs: [{ type: "uint256" }] },
  { name: "accruedInterest", type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],                                                       outputs: [{ type: "uint256" }] },
  { name: "healthFactor",    type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],                                                       outputs: [{ type: "uint256" }] },
  { name: "isLiquidatable",  type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],                                                       outputs: [{ type: "bool"    }] },
  { name: "totalBorrowed",   type: "function", stateMutability: "view",       inputs: [],                                                                                         outputs: [{ type: "uint256" }] },
  {
    name: "loans", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "tuple", components: [
      { name: "principal",  type: "uint256" },
      { name: "collateral", type: "uint256" },
      { name: "startTime",  type: "uint256" },
      { name: "active",     type: "bool"    },
    ]}],
  },
] as const;

export const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }],                                        outputs: [{ type: "uint256" }] },
  { name: "allowance", type: "function", stateMutability: "view",       inputs: [{ name: "owner",   type: "address" }, { name: "spender", type: "address" }],  outputs: [{ type: "uint256" }] },
  { name: "approve",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount",  type: "uint256"  }], outputs: [{ type: "bool"    }] },
  { name: "transfer",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "to",      type: "address" }, { name: "amount",  type: "uint256"  }], outputs: [{ type: "bool"    }] },
  { name: "decimals",  type: "function", stateMutability: "view",       inputs: [],                                                                             outputs: [{ type: "uint8"   }] },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const USDC_DECIMALS = 6;

export function formatUsdc(raw: bigint): string {
  const n = Number(raw) / 10 ** USDC_DECIMALS;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// Alias kept for AnalyticsTab which imports as formatUSDC (capital C)
export const formatUSDC = formatUsdc;

export function parseUsdc(human: string): bigint {
  return BigInt(Math.round(parseFloat(human) * 10 ** USDC_DECIMALS));
}

export function yieldMultiplierLabel(score: number): string {
  if (score >= 90) return "1.6×";
  if (score >= 80) return "1.4×";
  if (score >= 70) return "1.2×";
  if (score >= 50) return "1.0×";
  return "0.8×";
}

export function ltvLabel(score: number): string {
  if (score >= 90) return "70%";
  if (score >= 80) return "65%";
  if (score >= 70) return "60%";
  if (score >= 60) return "55%";
  return "50%";
}

export function healthColor(hf: number): string {
  if (hf >= 1.5) return "text-green-500";
  if (hf >= 1.1) return "text-yellow-500";
  return "text-red-500";
}

export function formatApy(apyBps: bigint): string {
  return (Number(apyBps) / 100).toFixed(2) + "% APY";
}

// ─── Countdown helper ─────────────────────────────────────────────────────────

/** Format seconds into a human-readable countdown: "3d 4h", "6h 12m", "45m", "now" */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "now";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Score tier helpers ───────────────────────────────────────────────────────
// Client-side display helpers — mirror the same 50/60/70/80/90 brackets used
// for the on-chain LTV fallback in useProtocol.ts, so labels stay consistent
// wherever a score shows up.

/** Returns a 0-5 tier index: 0 = unranked, 1 = Novice ... 5 = Oracle. */
export function scoreTier(score: number): number {
  if (score <= 0) return 0;
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 60) return 2;
  return 1;
}

/** Approximate display multiplier for a given score (e.g. "1.30x"). */
export function scoreToMultiplier(score: number): string {
  const mult =
    score >= 90 ? 1.5 :
    score >= 80 ? 1.3 :
    score >= 70 ? 1.15 :
    score >= 60 ? 1.05 : 1.0;
  return `${mult.toFixed(2)}x`;
}
