"use client";

import { useState } from "react";
import { useProtocol } from "../hooks/useProtocol";
import { formatUsdc } from "../lib/contracts";

type Tab = "deposit" | "withdraw";

export function VaultCard() {
  const {
    depositBalance, freeBalance, loanCollateral,
    // v2: replaces "yieldAccrued" — this is what the user actually receives on claim
    // (base yield already multiplied by their reputation score multiplier)
    earnedWithMultiplier,
    // v2: base yield before multiplier — shown as "before boost" for transparency
    earnedBase,
    usdcBalance,
    estimatedApy, yieldMultiplier,
    deposit, withdraw, claimYield,
    score,
  } = useProtocol();

  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // effective APY shown in the badge: base APY × user's multiplier
  const effectiveApy = (estimatedApy * yieldMultiplier).toFixed(2);

  // Whether there's anything to claim — use earnedWithMultiplier (the real claimable amount)
  const hasYield = earnedWithMultiplier > 0n;

  // Show a "boost" callout when the multiplier is actually doing work
  const hasBoost = yieldMultiplier > 1 && earnedBase > 0n;
  const boostAmount = hasBoost ? earnedWithMultiplier - earnedBase : 0n;

  async function handleAction() {
    if (!amount || isNaN(Number(amount))) return;
    setLoading(true);
    setTxHash(null);
    try {
      const hash = tab === "deposit"
        ? await deposit(amount)
        : await withdraw(amount);
      setTxHash(hash);
      setAmount("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    setLoading(true);
    try {
      await claimYield();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Vault</h2>
        <span className="text-xs text-emerald-400 font-semibold bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
          {effectiveApy}% APY effective
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Deposited" value={`$${formatUsdc(depositBalance)}`} />
        <StatBox label="Free"      value={`$${formatUsdc(freeBalance)}`} />
        <StatBox label="Locked"    value={`$${formatUsdc(loanCollateral)}`} dim />
      </div>

      {/* Yield claim strip — v2: earnedWithMultiplier replaces yieldAccrued */}
      {hasYield && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-gray-400">Claimable yield</p>
            <p className="text-lg font-bold text-emerald-400">${formatUsdc(earnedWithMultiplier)}</p>
            {/* Transparency: show base + boost split when multiplier > 1.0 */}
            {hasBoost && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                ${formatUsdc(earnedBase)} base&nbsp;
                <span className="text-emerald-600">+ ${formatUsdc(boostAmount)} score boost</span>
              </p>
            )}
          </div>
          <button
            onClick={handleClaim}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            {loading ? "…" : "Claim"}
          </button>
        </div>
      )}

      {/* Multiplier callout */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Your yield multiplier:</span>
        <span className="text-white font-semibold">{yieldMultiplier.toFixed(1)}×</span>
        <span className="text-gray-600">— earn more by predicting accurately</span>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
        {(["deposit", "withdraw"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm font-medium py-1.5 rounded-lg capitalize transition-colors ${
              tab === t ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 pr-16"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">USDC</span>
        </div>

        {tab === "deposit" && (
          <p className="text-xs text-gray-600">
            Wallet balance: ${formatUsdc(usdcBalance)}
          </p>
        )}
        {tab === "withdraw" && (
          <p className="text-xs text-gray-600">
            Available to withdraw: ${formatUsdc(freeBalance)}
          </p>
        )}

        <button
          onClick={handleAction}
          disabled={loading || !amount}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors capitalize"
        >
          {loading ? "Confirming…" : tab}
        </button>
      </div>

      {txHash && (
        <p className="text-xs text-gray-500 break-all">
          Tx:{" "}
          <a
            href={`https://testnet.arcscan.app/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white underline"
          >
            {txHash.slice(0, 20)}…
          </a>
        </p>
      )}
    </div>
  );
}

function StatBox({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3 flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-bold ${dim ? "text-gray-400" : "text-white"}`}>{value}</span>
    </div>
  );
}
