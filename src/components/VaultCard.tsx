"use client";
import { useState } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { useVaultData, useDeposit, useWithdraw } from "@/hooks/useProtocol";
import { formatUSDC, parseUSDC } from "@/lib/contracts";
import { useTheme } from "@/lib/theme";

const ARC_CHAIN_ID = 5042002;

export function VaultCard() {
  const { collateral, freeCollateral, locked, refetch } = useVaultData();
  const { approve, deposit, isPending: depositPending } = useDeposit();
  const { withdraw, isPending: withdrawPending } = useWithdraw();
  const { dark } = useTheme();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [switching, setSwitching] = useState(false);

  const [tab, setTab] = useState<"deposit"|"withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  const wrongNetwork = chainId !== ARC_CHAIN_ID;

  async function handleSwitchNetwork() {
    setSwitching(true);
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x4CE672" }],
          });
        } catch (e: any) {
          if (e?.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x4CE672",
                chainName: "Arc Testnet",
                nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
                rpcUrls: ["https://rpc.testnet.arc.network"],
                blockExplorerUrls: ["https://testnet.arcscan.app"],
              }],
            });
          }
        }
      } else {
        switchChain({ chainId: ARC_CHAIN_ID });
      }
    } catch (e: any) {
      setStatus("Could not switch network — please switch manually in your wallet");
    }
    setSwitching(false);
  }

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  const main = dark ? "text-white" : "text-gray-900";
  const inp = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const tabBg = dark ? "bg-gray-800" : "bg-gray-100";
  const tabActive = dark ? "bg-gray-700 text-white shadow-sm" : "bg-white text-gray-900 shadow-sm";
  const tabInactive = dark ? "text-gray-500" : "text-gray-400";

  async function switchAndRun(fn: () => Promise<void>) {
    try {
      if (wrongNetwork) {
        await handleSwitchNetwork();
        await new Promise(r => setTimeout(r, 1500));
        // Re-check after switch
        if (wrongNetwork) {
          setStatus("Please switch to Arc Testnet first");
          return;
        }
      }
      await fn();
    } catch (e: any) {
      setStatus("Error: " + (e?.shortMessage ?? e?.message ?? "unknown"));
    }
  }

  async function handleDeposit() {
    if (!amount) return;
    await switchAndRun(async () => {
      setStatus("Approving…");
      await approve(parseUSDC(amount));
      setStatus("Depositing…");
      await deposit(parseUSDC(amount));
      setStatus("Deposited ✓");
      setAmount("");
      refetch();
    });
  }

  async function handleWithdraw() {
    if (!amount) return;
    await switchAndRun(async () => {
      setStatus("Withdrawing…");
      await withdraw(parseUSDC(amount));
      setStatus("Withdrawn ✓");
      setAmount("");
      refetch();
    });
  }

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <div className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Collateral Vault</div>
      <div className={`text-3xl font-bold mb-1 ${main}`}>${formatUSDC(collateral)}</div>
      <div className={`text-xs mb-4 ${sub}`}>${formatUSDC(freeCollateral)} free · ${formatUSDC(locked)} locked</div>

      <div className={`flex gap-0.5 mb-3 p-0.5 rounded-lg ${tabBg}`}>
        {(["deposit","withdraw"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 text-xs py-1.5 rounded-md font-bold capitalize transition-colors ${tab === t ? tabActive : tabInactive}`}>
            {t}
          </button>
        ))}
      </div>

      <input
        type="number"
        placeholder="USDC amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 ${inp}`}
      />

      {wrongNetwork ? (
        <button
          onClick={handleSwitchNetwork}
          disabled={switching}
          className="w-full py-2.5 bg-yellow-500 text-gray-900 text-sm font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors"
        >
          {switching ? "Switching network…" : "⚠ Switch to Arc Testnet"}
        </button>
      ) : (
        <button
          onClick={tab === "deposit" ? handleDeposit : handleWithdraw}
          disabled={depositPending || withdrawPending || !amount}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {depositPending || withdrawPending ? "Processing…" : tab === "deposit" ? "Deposit" : "Withdraw"}
        </button>
      )}

      {status && <div className={`mt-2 text-xs ${sub}`}>{status}</div>}
    </div>
  );
}
