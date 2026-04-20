// Arc Network — ArcIQ Protocol
// Chain ID: 5042002 | Explorer: https://testnet.arcscan.app

export const ARC_USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export const CONTRACTS = {
  usdc:             ARC_USDC_ADDRESS,
  vault:            "0xF29E0FE8241979A6BC7e80215d9cB298F1b88c46",
  reputationEngine: "0xc125BBdD1829eC762f706e3DBC56b51B30d1f31f",
  predictionMarket: "0x07eFe12A668F1d4Eca51f2F0ee8ce6218EC891a5",
  lendingEngine:    "0xD822A9f8edC6C8372cB5D7F3Ac029e34C110b810",
} as const;

export const CHAIN_ID = 5042002;
export const ARC_EXPLORER = "https://testnet.arcscan.app";
export const ARC_FAUCET   = "https://faucet.circle.com";

// ── Proper ABI objects (not human-readable strings) ───────────────────────

export const ERC20_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }] },
  { name: "transfer", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }] },
] as const;

export const VAULT_ABI = [
  { name: "deposit", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "getCollateral", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "freeCollateral", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "locked", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
] as const;

export const REPUTATION_ABI = [
  { name: "getScore", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "getLTVMultiplier", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "getStats", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalPredictions", type: "uint256" },
      { name: "wins", type: "uint256" },
      { name: "score", type: "uint256" },
      { name: "ltvMultiplier", type: "uint256" },
    ] },
] as const;

export const MARKET_ABI = [
  { name: "marketCount", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getMarket", type: "function", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "question", type: "string" },
        { name: "endTime", type: "uint256" },
        { name: "resolved", type: "bool" },
        { name: "outcome", type: "bool" },
        { name: "yesPool", type: "uint256" },
        { name: "noPool", type: "uint256" },
        { name: "totalFees", type: "uint256" },
      ],
    }] },
  { name: "getPosition", type: "function", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }, { name: "user", type: "address" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "yesStake", type: "uint256" },
        { name: "noStake", type: "uint256" },
        { name: "claimed", type: "bool" },
      ],
    }] },
  { name: "getPayout", type: "function", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }, { name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "predict", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "side", type: "bool" },
      { name: "amount", type: "uint256" },
    ], outputs: [] },
  { name: "claimWinnings", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }], outputs: [] },
] as const;

export const LENDING_ABI = [
  { name: "maxBorrow", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "borrow", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "repay", type: "function", stateMutability: "nonpayable",
    inputs: [], outputs: [] },
  { name: "getLoan", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "principal", type: "uint256" },
      { name: "interest", type: "uint256" },
      { name: "totalDue", type: "uint256" },
      { name: "lockedCollateral", type: "uint256" },
      { name: "health", type: "uint256" },
    ] },
  { name: "accruedInterest", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "healthFactor", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────

export const USDC_DECIMALS = 6;

export function formatUSDC(wei: bigint): string {
  return (Number(wei) / 1e6).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseUSDC(dollars: string): bigint {
  return BigInt(Math.round(parseFloat(dollars) * 1e6));
}

export function scoreToMultiplier(score: number): string {
  if (score >= 90) return "1.4x";
  if (score >= 80) return "1.3x";
  if (score >= 70) return "1.2x";
  if (score >= 60) return "1.1x";
  return "1.0x";
}

export function scoreTier(score: number): number {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 60) return 2;
  return 1;
}

export function healthColor(health: number): string {
  if (health > 2) return "text-green-600";
  if (health > 1.2) return "text-yellow-600";
  return "text-red-600";
}

export function explorerTxUrl(txHash: string): string {
  return `${ARC_EXPLORER}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${ARC_EXPLORER}/address/${address}`;
}
