"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton({ size = "md" }: { size?: "md" | "lg" }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const base = "font-medium rounded-lg border transition-colors";
  const sizes = size === "lg"
    ? "px-8 py-3 text-base"
    : "px-4 py-1.5 text-sm";

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className={`${base} ${sizes} bg-white text-gray-700 border-gray-200 hover:bg-gray-50`}
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className={`${base} ${sizes} bg-blue-600 text-white border-blue-600 hover:bg-blue-700`}
    >
      Connect wallet
    </button>
  );
}
