/**
 * useProtocol — central hook for all ArcIQ contract interactions.
 *
 * v2 changes:
 *   - "yieldAccrued" read removed — Vault v2 has no such mapping.
 *     Replaced with "earned" (base) and "earnedWithMultiplier" (display).
 *   - "secondsUntilNextDistribution" added — drives countdown timer in YieldCard.
 *   - "totalFreeBalance" added — vault-wide free balance for deploy threshold UI.
 *   - "totalEliteDeposits" added — for elite pool context display.
 *   - "deployedToSource" added — shows how much is currently in USYCYieldAdapter.
 *   - USYC adapter reads added (pendingAdapterYield, adapterApy) — gated on
 *     CONTRACT_ADDRESSES.usycAdapter being non-null.
 *   - "totalLiquidationFeesCollected" → "totalLiquidationFeesReceived" (matches v2 contract).
 *   - USYC balance read added for wallet display.
 */

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import {
  CONTRACT_ADDRESSES,
  VAULT_ABI,
  YIELD_ROUTER_ABI,
  REPUTATION_ENGINE_ABI,
  PREDICTION_MARKET_ABI,
  LENDING_ENGINE_ABI,
  USYC_ADAPTER_ABI,
  ERC20_ABI,
  USDC_DECIMALS,
} from "../lib/contracts";

const VAULT   = CONTRACT_ADDRESSES.vault            as `0x${string}`;
const ROUTER  = CONTRACT_ADDRESSES.yieldRouter      as `0x${string}`;
const REP     = CONTRACT_ADDRESSES.reputationEngine as `0x${string}`;
const MARKET  = CONTRACT_ADDRESSES.predictionMarket as `0x${string}`;
const LENDING = CONTRACT_ADDRESSES.lendingEngine    as `0x${string}`;
const USDC    = CONTRACT_ADDRESSES.usdc             as `0x${string}`;
const USYC    = CONTRACT_ADDRESSES.usyc             as `0x${string}`;
const ADAPTER = CONTRACT_ADDRESSES.usycAdapter      as `0x${string}` | null;

function u(amount: string) {
  return parseUnits(amount, USDC_DECIMALS);
}

export function useProtocol() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // ─── Score & reputation ────────────────────────────────────────────────

  const { data: score } = useReadContract({
    address: REP, abi: REPUTATION_ENGINE_ABI,
    functionName: "getScore", args: [address!],
    query: { enabled: !!address },
  });

  const { data: yieldMult } = useReadContract({
    address: REP, abi: REPUTATION_ENGINE_ABI,
    functionName: "yieldMultiplier", args: [address!],
    query: { enabled: !!address },
  });

  const { data: ltvMult } = useReadContract({
    address: REP, abi: REPUTATION_ENGINE_ABI,
    functionName: "ltvMultiplier", args: [address!],
    query: { enabled: !!address },
  });

  const { data: isElite } = useReadContract({
    address: REP, abi: REPUTATION_ENGINE_ABI,
    functionName: "isElite", args: [address!],
    query: { enabled: !!address },
  });

  // ─── Vault (user) ─────────────────────────────────────────────────────

  const { data: depositBalance } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "deposits", args: [address!],
    query: { enabled: !!address },
  });

  const { data: lockedCollateral } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "lockedCollateral", args: [address!],
    query: { enabled: !!address },
  });

  const { data: freeBalance } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "freeBalance", args: [address!],
    query: { enabled: !!address },
  });

  // v2: base yield before reputation multiplier (used for internal calc only)
  const { data: earnedBase } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "earned", args: [address!],
    query: { enabled: !!address },
  });

  // v2: yield after multiplier — this is what the user actually receives on claim
  const { data: earnedWithMultiplier } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "earnedWithMultiplier", args: [address!],
    query: { enabled: !!address },
  });

  // ─── Vault (global) ───────────────────────────────────────────────────

  const { data: totalDeposits } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "totalDeposits",
  });

  const { data: totalLocked } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "totalLocked",
  });

  // v2: totalDeposits - totalLocked in one call
  const { data: totalFreeBalance } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "totalFreeBalance",
  });

  const { data: totalYieldDistributed } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "totalYieldDistributed",
  });

  // v2: running sum of elite depositor balances (O(1) — maintained by Vault)
  const { data: totalEliteDeposits } = useReadContract({
    address: VAULT, abi: VAULT_ABI,
    functionName: "totalEliteDeposits",
  });

  // ─── YieldRouter ──────────────────────────────────────────────────────

  const { data: pendingTotal } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "pendingTotal",
  });

  const { data: eliteBonusPool } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "eliteBonusPool",
  });

  const { data: estimatedApy } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "estimatedApy",
  });

  const { data: pendingUsdcToVault } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "pendingUsdcToVault",
  });

  const { data: lastDistribution } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "lastDistributionTimestamp",
  });

  // v2: seconds until distribute() is callable — 0 = callable right now
  const { data: secondsUntilDistribution } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "secondsUntilNextDistribution",
  });

  // v2: amount currently deployed into USYCYieldAdapter
  const { data: deployedToSource } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "deployedToSource",
  });

  const { data: totalToVault } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "totalDistributedToVault",
  });

  const { data: totalToTreasury } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "totalDistributedToTreasury",
  });

  const { data: totalBorrowInterestReceived } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "totalBorrowInterestReceived",
  });

  // FIXED: v1 used "totalLiquidationFeesCollected" — v2 contract var is "totalLiquidationFeesReceived"
  const { data: totalLiquidationFeesReceived } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "totalLiquidationFeesReceived",
  });

  const { data: totalPredictionFeesReceived } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "totalPredictionFeesReceived",
  });

  const { data: totalExternalYieldHarvested } = useReadContract({
    address: ROUTER, abi: YIELD_ROUTER_ABI,
    functionName: "totalExternalYieldHarvested",
  });

  // ─── USYC Adapter (only when deployed and address is set) ────────────

  const { data: adapterPendingYield } = useReadContract({
    address: ADAPTER ?? undefined, abi: USYC_ADAPTER_ABI,
    functionName: "pendingYield",
    query: { enabled: !!ADAPTER },
  });

  const { data: adapterApyBps } = useReadContract({
    address: ADAPTER ?? undefined, abi: USYC_ADAPTER_ABI,
    functionName: "apyBps",
    query: { enabled: !!ADAPTER },
  });

  const { data: adapterDeployed } = useReadContract({
    address: ADAPTER ?? undefined, abi: USYC_ADAPTER_ABI,
    functionName: "totalDeposited",
    query: { enabled: !!ADAPTER },
  });

  // ─── Token balances ───────────────────────────────────────────────────

  const { data: usdcBalance } = useReadContract({
    address: USDC, abi: ERC20_ABI,
    functionName: "balanceOf", args: [address!],
    query: { enabled: !!address },
  });

  const { data: usycBalance } = useReadContract({
    address: USYC, abi: ERC20_ABI,
    functionName: "balanceOf", args: [address!],
    query: { enabled: !!address },
  });

  const { data: usdcAllowanceVault } = useReadContract({
    address: USDC, abi: ERC20_ABI,
    functionName: "allowance", args: [address!, VAULT],
    query: { enabled: !!address },
  });

  const { data: usdcAllowanceLending } = useReadContract({
    address: USDC, abi: ERC20_ABI,
    functionName: "allowance", args: [address!, LENDING],
    query: { enabled: !!address },
  });

  const { data: usdcAllowanceMarket } = useReadContract({
    address: USDC, abi: ERC20_ABI,
    functionName: "allowance", args: [address!, MARKET],
    query: { enabled: !!address },
  });

  // ─── Lending ──────────────────────────────────────────────────────────

  const { data: loan } = useReadContract({
    address: LENDING, abi: LENDING_ENGINE_ABI,
    functionName: "loans", args: [address!],
    query: { enabled: !!address },
  });

  const { data: accruedInterest } = useReadContract({
    address: LENDING, abi: LENDING_ENGINE_ABI,
    functionName: "accruedInterest", args: [address!],
    query: { enabled: !!address },
  });

  const { data: healthFactor } = useReadContract({
    address: LENDING, abi: LENDING_ENGINE_ABI,
    functionName: "healthFactor", args: [address!],
    query: { enabled: !!address },
  });

  const { data: totalBorrowed } = useReadContract({
    address: LENDING, abi: LENDING_ENGINE_ABI,
    functionName: "totalBorrowed",
  });

  // ─── Prediction Market ────────────────────────────────────────────────

  const { data: nextMarketId } = useReadContract({
    address: MARKET, abi: PREDICTION_MARKET_ABI,
    functionName: "nextMarketId",
  });

  // ─── Write actions ────────────────────────────────────────────────────

  async function approveUsdc(spender: `0x${string}`, amount: string) {
    return writeContractAsync({
      address: USDC, abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, u(amount)],
    });
  }

  async function deposit(amount: string) {
    if ((usdcAllowanceVault ?? 0n) < u(amount)) {
      await approveUsdc(VAULT, amount);
    }
    return writeContractAsync({
      address: VAULT, abi: VAULT_ABI,
      functionName: "deposit",
      args: [u(amount)],
    });
  }

  async function withdraw(amount: string) {
    return writeContractAsync({
      address: VAULT, abi: VAULT_ABI,
      functionName: "withdraw",
      args: [u(amount)],
    });
  }

  async function claimYield() {
    return writeContractAsync({
      address: VAULT, abi: VAULT_ABI,
      functionName: "claimYield",
    });
  }

  async function claimEliteBonus() {
    return writeContractAsync({
      address: ROUTER, abi: YIELD_ROUTER_ABI,
      functionName: "claimEliteBonus",
    });
  }

  async function distributeYield() {
    return writeContractAsync({
      address: ROUTER, abi: YIELD_ROUTER_ABI,
      functionName: "distribute",
    });
  }

  async function deployToSource() {
    return writeContractAsync({
      address: ROUTER, abi: YIELD_ROUTER_ABI,
      functionName: "deployToSource",
    });
  }

  async function predict(marketId: bigint, yes: boolean, amount: string) {
    if ((usdcAllowanceMarket ?? 0n) < u(amount)) {
      await approveUsdc(MARKET, amount);
    }
    return writeContractAsync({
      address: MARKET, abi: PREDICTION_MARKET_ABI,
      functionName: "predict",
      args: [marketId, yes, u(amount)],
    });
  }

  async function claimWinnings(marketId: bigint) {
    return writeContractAsync({
      address: MARKET, abi: PREDICTION_MARKET_ABI,
      functionName: "claimWinnings",
      args: [marketId],
    });
  }

  async function borrow(collateral: string, amount: string) {
    if ((usdcAllowanceLending ?? 0n) < u(collateral)) {
      await approveUsdc(LENDING, collateral);
    }
    return writeContractAsync({
      address: LENDING, abi: LENDING_ENGINE_ABI,
      functionName: "borrow",
      args: [u(collateral), u(amount)],
    });
  }

  async function repay() {
    return writeContractAsync({
      address: LENDING, abi: LENDING_ENGINE_ABI,
      functionName: "repay",
    });
  }

  async function liquidate(borrower: `0x${string}`) {
    return writeContractAsync({
      address: LENDING, abi: LENDING_ENGINE_ABI,
      functionName: "liquidate",
      args: [borrower],
    });
  }

  // ─── Derived values ───────────────────────────────────────────────────

  const scoreNum       = Number(score ?? 50n);
  const yieldMultNum   = Number(yieldMult ?? 10_000n) / 10_000;
  const ltvRaw         = Number(ltvMult ?? 0n);
  const ltvPct         = ltvRaw > 0
    ? (ltvRaw / 10_000) * 50
    : scoreNum >= 90 ? 70 : scoreNum >= 80 ? 65 : scoreNum >= 70 ? 60 : scoreNum >= 60 ? 55 : 50;

  const hasAdapter         = !!ADAPTER;
  const secsUntilDist      = Number(secondsUntilDistribution ?? 0n);
  const canDistribute      = secsUntilDist === 0;

  return {
    // Address
    address,

    // Score
    score: scoreNum,
    yieldMultiplier: yieldMultNum,
    ltvPct,
    isElite: !!isElite,

    // Vault — user
    depositBalance:   depositBalance   ?? 0n,
    lockedCollateral: lockedCollateral ?? 0n,
    // Derived client-side: Vault.freeBalance() does not reflect locked collateral correctly,
    // so compute depositBalance - loanCollateral (the loan struct is the source of truth).
    freeBalance: (() => { const dep = depositBalance ?? 0n; const col = (loan as any)?.collateral ?? 0n; return dep > col ? dep - col : 0n; })(),
    // v2: use earnedWithMultiplier everywhere for display (what user actually receives)
    earnedWithMultiplier: earnedWithMultiplier ?? 0n,
    // v2: base yield exposed for transparency (multiplier not yet applied)
    earnedBase:       earnedBase       ?? 0n,

    // Vault — global
    totalDeposits:        totalDeposits        ?? 0n,
    totalLocked:          totalLocked          ?? 0n,
    totalFreeBalance:     totalFreeBalance     ?? 0n,
    totalYieldDistributed: totalYieldDistributed ?? 0n,
    totalEliteDeposits:   totalEliteDeposits   ?? 0n,

    // Yield router
    pendingTotal:             pendingTotal          ?? 0n,
    eliteBonusPool:           eliteBonusPool        ?? 0n,
    estimatedApy:             Number(estimatedApy   ?? 0n) / 100, // bps → percent
    pendingUsdcToVault:       pendingUsdcToVault    ?? 0n,        // raw USDC (6 dec) accruing this epoch
    lastDistribution:         lastDistribution ? Number(lastDistribution) * 1000 : null,
    secondsUntilDistribution: secsUntilDist,
    canDistribute,
    deployedToSource:         deployedToSource      ?? 0n,
    totalToVault:             totalToVault          ?? 0n,
    totalToTreasury:          totalToTreasury       ?? 0n,
    totalBorrowInterestReceived:   totalBorrowInterestReceived   ?? 0n,
    totalLiquidationFeesReceived:  totalLiquidationFeesReceived  ?? 0n,
    totalPredictionFeesReceived:   totalPredictionFeesReceived   ?? 0n,
    totalExternalYieldHarvested:   totalExternalYieldHarvested   ?? 0n,

    // USYC adapter (null when adapter not deployed)
    hasAdapter,
    adapterPendingYield: adapterPendingYield ?? 0n,
    adapterApy:          Number(adapterApyBps ?? 0n) / 100, // bps → percent
    adapterDeployed:     adapterDeployed ?? 0n,

    // Token balances
    usdcBalance: usdcBalance ?? 0n,
    usycBalance: usycBalance ?? 0n,

    // Lending
    loan,
    loanCollateral:  (loan as any)?.collateral ?? 0n,
    accruedInterest: accruedInterest ?? 0n,
    healthFactor:    Number(healthFactor ?? 0n) / 10_000,
    totalBorrowed:   totalBorrowed ?? 0n,

    // Markets
    nextMarketId: Number(nextMarketId ?? 0n),

    // Write actions
    deposit,
    withdraw,
    claimYield,
    claimEliteBonus,
    distributeYield,
    deployToSource,
    predict,
    claimWinnings,
    borrow,
    repay,
    liquidate,
    approveUsdc,
  };
}
