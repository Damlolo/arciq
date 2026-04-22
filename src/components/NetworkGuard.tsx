"use client";
import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { useTheme } from "@/lib/theme";

const ARC_CHAIN_ID = 5042002;
const ARC_CHAIN_HEX = "0x4CE672";

async function switchToArc() {
  const eth = (window as any).ethereum;
  if (!eth) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_CHAIN_HEX }],
    });
  } catch (e: any) {
    if (e.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: ARC_CHAIN_HEX,
          chainName: "Arc Testnet",
          nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
          rpcUrls: ["https://rpc.testnet.arc.network"],
          blockExplorerUrls: ["https://testnet.arcscan.app"],
        }],
      });
    }
  }
}

export function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { dark } = useTheme();
  const [loading, setLoading] = useState(false);

  const wrong = isConnected && chainId !== ARC_CHAIN_ID;

  // Auto-switch immediately when connected on wrong network
  useEffect(() => {
    if (wrong) switchToArc();
  }, [wrong]);

  if (!wrong) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 py-3 ${dark ? "bg-yellow-600 text-white" : "bg-yellow-400 text-gray-900"}`}>
      <span className="text-xs font-semibold">Wrong network — Arc Testnet required</span>
      <button
        disabled={loading}
        onClick={async () => { setLoading(true); await switchToArc(); setLoading(false); }}
        className="text-xs font-bold px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? "Switching…" : "Switch Now"}
      </button>
    </div>
  );
}
