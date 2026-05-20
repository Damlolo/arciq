"use client";

import Image from "next/image";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUsdc } from "../lib/contracts";
import { useProtocol } from "../hooks/useProtocol";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { usdcBalance, score } = useProtocol();

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
      >
        Connect wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5">
        <span className="text-xs text-gray-400">ArcIQ</span>
        <span className="text-xs font-bold text-white">{score}</span>
      </div>
      <div className="hidden sm:flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5">
        <span className="text-xs text-gray-400">Balance</span>
        <span className="text-xs font-bold text-white">${formatUsdc(usdcBalance)}</span>
      </div>
      <button
        onClick={() => disconnect()}
        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors"
      >
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </button>
    </div>
  );
}

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Image
            src="/logo.png"
            alt="ArcIQ Logo"
            width={42}
            height={42}
            className="rounded-xl object-contain"
          />
          <div className="flex items-center">
            <span className="text-lg font-bold text-white">Arc</span>
            <span className="text-lg font-bold text-blue-400">IQ</span>
          </div>
          <span className="text-xs text-gray-600 ml-1 hidden sm:inline">Predict smarter. Borrow better.</span>
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}
