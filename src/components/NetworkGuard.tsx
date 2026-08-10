"use client";

// Circle User-Controlled Wallets are created directly on ARC-TESTNET — there's
// no injected browser wallet to be on the "wrong network", so the old
// switch-chain banner has no job to do anymore. Kept as a no-op export so
// nothing breaks if it's imported elsewhere; safe to delete entirely.
export function NetworkGuard() {
  return null;
}
