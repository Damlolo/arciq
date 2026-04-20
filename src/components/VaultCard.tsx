"use client";
import { useState } from "react";
import { useVaultData, useDeposit, useWithdraw } from "@/hooks/useProtocol";
import { formatUSDC, parseUSDC } from "@/lib/contracts";
import { useTheme } from "@/lib/theme";

export function VaultCard() {
  const { collateral, freeCollateral, locked, refetch } = useVaultData();
  const { approve, deposit, isPending: depositPending } = useDeposit();
  const { withdraw, isPending: withdrawPending } = useWithdraw();
  const { dark } = useTheme();

  const [tab, setTab] = useState<"deposit"|"withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  const main = dark ? "text-white" : "text-gray-900";
  const inp = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const tabBg = dark ? "bg-gray-800" : "bg-gray-100";
  const tabActive = dark ? "bg-gray-700 text-white shadow-sm" : "bg-white text-gray-900 shadow-sm";
  const tabInactive = dark ? "text-gray-500" : "text-gray-400";

  async function handleDeposit() {
    if (!amount) return;
    try {
      setStatus("Approving…");
      await approve(parseUSDC(amount));
      setStatus("Depositing…");
      await deposit(parseUSDC(amount));
      setStatus("Deposited ✓");
      setAmount(""); refetch();
    } catch (e: any) { setStatus("Error: " + (e?.shortMessage ?? e?.message)); }
  }

  async function handleWithdraw() {
    if (!amount) return;
    try {
      setStatus("Withdrawing…");
      await withdraw(parseUSDC(amount));
      setStatus("Withdrawn ✓");
      setAmount(""); refetch();
    } catch (e: any) { setStatus("Error: " + (e?.shortMessage ?? e?.message)); }
  }

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <div className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Collateral Vault</div>
      <div className={`text-3xl font-bold mb-1 ${main}`}>${formatUSDC(collateral)}</div>
      <div className={`text-xs mb-4 ${sub}`}>${formatUSDC(freeCollateral)} free · ${formatUSDC(locked)} locked</div>

      {/* Tab switcher */}
      <div className={`flex gap-0.5 mb-3 p-0.5 rounded-lg ${tabBg}`}>
        {(["deposit","withdraw"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 text-xs py-1.5 rounded-md font-bold capitalize transition-colors ${tab === t ? tabActive : tabInactive}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Input — full width, button below */}
      <input
        type="number"
        placeholder="USDC amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 ${inp}`}
      />
      <button
        onClick={tab === "deposit" ? handleDeposit : handleWithdraw}
        disabled={depositPending || withdrawPending || !amount}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {depositPending || withdrawPending ? "Processing…" : tab === "deposit" ? "Deposit" : "Withdraw"}
      </button>

      {status && <div className={`mt-2 text-xs ${sub}`}>{status}</div>}
    </div>
  );
}
