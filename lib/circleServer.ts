import "server-only";
import { initiateUserControlledWalletsClient, Blockchain } from "@circle-fin/user-controlled-wallets";

// Server-only Circle client. NEVER import this from a "use client" file —
// it holds the secret API key.
//
// Required env var: CIRCLE_API_KEY (from Circle Developer Console → API Keys)

const apiKey = process.env.CIRCLE_API_KEY;
if (!apiKey) {
  // Don't throw at module load in dev/build — throw lazily on first use instead,
  // so `next build` doesn't fail before env vars are wired up.
  console.warn("[circleServer] CIRCLE_API_KEY is not set — Circle wallet routes will fail.");
}

export const circleClient = initiateUserControlledWalletsClient({
  apiKey: apiKey ?? "",
});

// Confirmed against the installed @circle-fin/user-controlled-wallets Blockchain
// enum (v10.8.0) — Blockchain.ArcTestnet === "ARC-TESTNET".
export const ARC_TESTNET_BLOCKCHAIN = Blockchain.ArcTestnet;
