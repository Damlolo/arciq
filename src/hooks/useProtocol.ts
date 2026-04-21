"use client";

import { useAccount, useReadContract, useWriteContract, useReadContracts, useBalance } from "wagmi";
import {
  CONTRACTS, VAULT_ABI, REPUTATION_ABI, MARKET_ABI, LENDING_ABI, ERC20_ABI,
} from "@/lib/contracts";

const CHAIN_ID = 5042002 as const;

// Helper to cast addresses for wagmi v2
const addr = (a: string) => a as `0x${string}`;

// ── Vault ──────────────────────────────────────────────────────────────────

export function useVaultData() {
  const { address } = useAccount();
  const { data, refetch } = useReadContracts({
    contracts: [
      { address: addr(CONTRACTS.vault), abi: VAULT_ABI, functionName: "getCollateral", args: [address!] },
      { address: addr(CONTRACTS.vault), abi: VAULT_ABI, functionName: "freeCollateral", args: [address!] },
      { address: addr(CONTRACTS.vault), abi: VAULT_ABI, functionName: "locked", args: [address!] },
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

  const approve = async (amount: bigint) =>
    writeContractAsync({ chainId: CHAIN_ID, address: addr(CONTRACTS.usdc), abi: ERC20_ABI, functionName: "approve", args: [addr(CONTRACTS.vault), amount] });

  const deposit = async (amount: bigint) =>
    writeContractAsync({ chainId: CHAIN_ID, address: addr(CONTRACTS.vault), abi: VAULT_ABI, functionName: "deposit", args: [amount] });

  return { approve, deposit, isPending };
}

export function useWithdraw() {
  const { writeContractAsync, isPending } = useWriteContract();

  const withdraw = async (amount: bigint) =>
    writeContractAsync({ chainId: CHAIN_ID, address: addr(CONTRACTS.vault), abi: VAULT_ABI, functionName: "withdraw", args: [amount] });

  return { withdraw, isPending };
}

// ── Reputation ─────────────────────────────────────────────────────────────

export function useReputation(address?: `0x${string}`) {
  const { data, refetch } = useReadContract({
    address: addr(CONTRACTS.reputationEngine),
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
    address: addr(CONTRACTS.predictionMarket),
    abi: MARKET_ABI,
    functionName: "marketCount",
  });
  return Number(data ?? 0n);
}

export function useMarket(id: number) {
  const { address } = useAccount();

  const { data: market, refetch: refetchMarket } = useReadContract({
    address: addr(CONTRACTS.predictionMarket),
    abi: MARKET_ABI,
    functionName: "getMarket",
    args: [BigInt(id)],
  });

  const { data: position, refetch: refetchPosition } = useReadContract({
    address: addr(CONTRACTS.predictionMarket),
    abi: MARKET_ABI,
    functionName: "getPosition",
    args: [BigInt(id), address!],
    query: { enabled: !!address },
  });

  const { data: payout, refetch: refetchPayout } = useReadContract({
    address: addr(CONTRACTS.predictionMarket),
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

  const approveMarket = async (amount: bigint) =>
    writeContractAsync({ chainId: CHAIN_ID, address: addr(CONTRACTS.usdc), abi: ERC20_ABI, functionName: "approve", args: [addr(CONTRACTS.predictionMarket), amount] });

  const predict = async (marketId: number, side: boolean, amount: bigint) =>
    writeContractAsync({ chainId: CHAIN_ID, address: addr(CONTRACTS.predictionMarket), abi: MARKET_ABI, functionName: "predict", args: [BigInt(marketId), side, amount] });

  const claimWinnings = async (marketId: number) =>
    writeContractAsync({ chainId: CHAIN_ID, address: addr(CONTRACTS.predictionMarket), abi: MARKET_ABI, functionName: "claimWinnings", args: [BigInt(marketId)] });

  return { approveMarket, predict, claimWinnings, isPending };
}

// ── Lending ────────────────────────────────────────────────────────────────

export function useLoanData() {
  const { address } = useAccount();

  const { data: loan, refetch: refetchLoan } = useReadContract({
    address: addr(CONTRACTS.lendingEngine),
    abi: LENDING_ABI,
    functionName: "getLoan",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: maxBorrow, refetch: refetchMax } = useReadContract({
    address: addr(CONTRACTS.lendingEngine),
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

  const borrow = async (amount: bigint) =>
    writeContractAsync({ chainId: CHAIN_ID, address: addr(CONTRACTS.lendingEngine), abi: LENDING_ABI, functionName: "borrow", args: [amount] });

  return { borrow, isPending };
}

export function useRepay() {
  const { writeContractAsync, isPending } = useWriteContract();

  const approveLending = async (amount: bigint) =>
    writeContractAsync({ chainId: CHAIN_ID, address: addr(CONTRACTS.usdc), abi: ERC20_ABI, functionName: "approve", args: [addr(CONTRACTS.lendingEngine), amount] });

  const repay = async () =>
    writeContractAsync({ chainId: CHAIN_ID, address: addr(CONTRACTS.lendingEngine), abi: LENDING_ABI, functionName: "repay" });

  return { approveLending, repay, isPending };
}

// ── USDC balance ───────────────────────────────────────────────────────────

export function useUSDCBalance() {
  const { address } = useAccount();

  const { data: erc20Balance, refetch: refetchErc20 } = useReadContract({
    address: addr(CONTRACTS.usdc),
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: address,
    query: { enabled: !!address },
  });

  let balance = erc20Balance ?? 0n;
  if (balance === 0n && nativeBalance && nativeBalance.value > 0n) {
    balance = nativeBalance.value / 1_000_000_000_000n;
  }

  return {
    balance,
    refetch: () => { refetchErc20(); refetchNative(); },
  };
}
