"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts, useBalance } from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import {
  CONTRACTS, VAULT_ABI, REPUTATION_ABI, MARKET_ABI, LENDING_ABI, ERC20_ABI,
  formatUSDC, parseUSDC
} from "@/lib/contracts";

// ── Vault ──────────────────────────────────────────────────────────────────

export function useVaultData() {
  const { address } = useAccount();

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: CONTRACTS.vault, abi: VAULT_ABI, functionName: "getCollateral", args: [address!] },
      { address: CONTRACTS.vault, abi: VAULT_ABI, functionName: "freeCollateral", args: [address!] },
      { address: CONTRACTS.vault, abi: VAULT_ABI, functionName: "locked", args: [address!] },
    ],
    query: { enabled: !!address },
  });

  return {
    collateral: data?.[0]?.result ?? 0n,
    freeCollateral: data?.[1]?.result ?? 0n,
    locked: data?.[2]?.result ?? 0n,
    refetch,
  };
}

export function useDeposit() {
  const { writeContractAsync, isPending } = useWriteContract();

  const approve = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.vault, amount],
    });
  };

  const deposit = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: "deposit",
      args: [amount],
    });
  };

  return { approve, deposit, isPending };
}

export function useWithdraw() {
  const { writeContractAsync, isPending } = useWriteContract();

  const withdraw = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: "withdraw",
      args: [amount],
    });
  };

  return { withdraw, isPending };
}

// ── Reputation ─────────────────────────────────────────────────────────────

export function useReputation(address?: `0x${string}`) {
  const { data, refetch } = useReadContract({
    address: CONTRACTS.reputationEngine,
    abi: REPUTATION_ABI,
    functionName: "getStats",
    args: [address!],
    query: { enabled: !!address },
  });

  return {
    totalPredictions: data?.[0] ?? 0n,
    wins: data?.[1] ?? 0n,
    score: Number(data?.[2] ?? 50n),
    ltvMultiplier: Number(data?.[3] ?? 100n),
    refetch,
  };
}

// ── Markets ────────────────────────────────────────────────────────────────

export function useMarketCount() {
  const { data } = useReadContract({
    address: CONTRACTS.predictionMarket,
    abi: MARKET_ABI,
    functionName: "marketCount",
  });
  return Number(data ?? 0n);
}

export function useMarket(id: number) {
  const { address } = useAccount();

  const { data: market, refetch: refetchMarket } = useReadContract({
    address: CONTRACTS.predictionMarket,
    abi: MARKET_ABI,
    functionName: "getMarket",
    args: [BigInt(id)],
  });

  const { data: position, refetch: refetchPosition } = useReadContract({
    address: CONTRACTS.predictionMarket,
    abi: MARKET_ABI,
    functionName: "getPosition",
    args: [BigInt(id), address!],
    query: { enabled: !!address },
  });

  const { data: payout, refetch: refetchPayout } = useReadContract({
    address: CONTRACTS.predictionMarket,
    abi: MARKET_ABI,
    functionName: "getPayout",
    args: [BigInt(id), address!],
    query: { enabled: !!address },
  });

  return {
    market,
    position,
    payout: payout ?? 0n,
    refetch: () => { refetchMarket(); refetchPosition(); refetchPayout(); },
  };
}

export function usePredict() {
  const { writeContractAsync, isPending } = useWriteContract();

  const approveMarket = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.predictionMarket, amount],
    });
  };

  const predict = async (marketId: number, side: boolean, amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.predictionMarket,
      abi: MARKET_ABI,
      functionName: "predict",
      args: [BigInt(marketId), side, amount],
    });
  };

  const claimWinnings = async (marketId: number) => {
    return writeContractAsync({
      address: CONTRACTS.predictionMarket,
      abi: MARKET_ABI,
      functionName: "claimWinnings",
      args: [BigInt(marketId)],
    });
  };

  return { approveMarket, predict, claimWinnings, isPending };
}

// ── Lending ────────────────────────────────────────────────────────────────

export function useLoanData() {
  const { address } = useAccount();

  const { data: loan, refetch: refetchLoan } = useReadContract({
    address: CONTRACTS.lendingEngine,
    abi: LENDING_ABI,
    functionName: "getLoan",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: maxBorrow, refetch: refetchMax } = useReadContract({
    address: CONTRACTS.lendingEngine,
    abi: LENDING_ABI,
    functionName: "maxBorrow",
    args: [address!],
    query: { enabled: !!address },
  });

  const principal = loan?.[0] ?? 0n;
  const interest = loan?.[1] ?? 0n;
  const totalDue = loan?.[2] ?? 0n;
  const lockedCollateral = loan?.[3] ?? 0n;
  const health = loan?.[4] ?? 0n;

  return {
    principal,
    interest,
    totalDue,
    lockedCollateral,
    healthFactor: health === 0n ? Infinity : Number(health) / 1e18,
    maxBorrow: maxBorrow ?? 0n,
    hasLoan: principal > 0n,
    refetch: () => { refetchLoan(); refetchMax(); },
  };
}

export function useBorrow() {
  const { writeContractAsync, isPending } = useWriteContract();

  const borrow = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.lendingEngine,
      abi: LENDING_ABI,
      functionName: "borrow",
      args: [amount],
    });
  };

  return { borrow, isPending };
}

export function useRepay() {
  const { writeContractAsync, isPending } = useWriteContract();

  const approveLending = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.lendingEngine, amount],
    });
  };

  const repay = async () => {
    return writeContractAsync({
      address: CONTRACTS.lendingEngine,
      abi: LENDING_ABI,
      functionName: "repay",
    });
  };

  return { approveLending, repay, isPending };
}

// ── USDC balance ───────────────────────────────────────────────────────────
// On Arc, USDC is the native gas token at 0x3600...0000.
// The ERC-20 interface returns balance in 6 decimals.
// We try ERC-20 first, then fall back to native balance (18 decimals → convert to 6).

export function useUSDCBalance() {
  const { address } = useAccount();

  // Try ERC-20 balanceOf first (6 decimals)
  const { data: erc20Balance, refetch: refetchErc20 } = useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  // Also read native balance as fallback (18 decimals on Arc)
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: address,
    query: { enabled: !!address },
  });

  // Use ERC-20 balance if non-zero, otherwise convert native (18 dec) to 6 dec
  let balance = erc20Balance ?? 0n;
  if (balance === 0n && nativeBalance && nativeBalance.value > 0n) {
    // Convert from 18 decimals to 6 decimals
    balance = nativeBalance.value / 1_000_000_000_000n;
  }

  return {
    balance,
    refetch: () => { refetchErc20(); refetchNative(); },
  };
}
