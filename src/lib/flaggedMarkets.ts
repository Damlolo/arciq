// Market IDs that the keeper (scripts/masterKeeperV3.ts) has flagged as
// unresolvable after repeated failed resolution attempts. Hidden from both
// the Active and Resolved tabs in MarketList.tsx until someone resolves them
// manually and removes the ID here.
//
// Sync workflow: when the keeper logs "🚩 Market <id> flagged for manual
// review", open data/flagged-markets.json on the machine running the keeper,
// copy the id(s) in here, commit, and redeploy.
export const FLAGGED_MARKET_IDS: number[] = [
  // e.g. 8, 9, 11,
];

export const FLAGGED_MARKET_ID_SET = new Set(FLAGGED_MARKET_IDS);
