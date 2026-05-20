"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../lib/wagmi";
import { Navbar } from "../components/Navbar";
import { ScoreCard } from "../components/ScoreCard";
import { ProfileCard } from "../components/ProfileCard";
import { VaultCard } from "../components/VaultCard";
import { YieldCard } from "../components/YieldCard";
import { BorrowPanel } from "../components/BorrowPanel";
import { MarketList } from "../components/MarketList";
import { LoopFlow } from "../components/LoopFlow";

const queryClient = new QueryClient();

export default function Home() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-950 text-white">
          <Navbar />

          <main className="max-w-6xl mx-auto px-4 py-8">
            {/* Hero */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Predict smarter.{" "}
                <span className="text-blue-400">Borrow better.</span>
              </h1>
              <p className="text-gray-400 text-sm max-w-lg mx-auto">
                Deposit USDC → earn multi-source yield → predict markets → score rises →
                unlock higher LTV and a 1.6× yield multiplier.
              </p>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left column */}
              <div className="flex flex-col gap-6">
                <ScoreCard />
                <LoopFlow />
              </div>

              {/* Middle column */}
              <div className="flex flex-col gap-6">
                <VaultCard />
                <LoanCard />
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-6">
                <YieldCard />
              </div>
            </div>

            {/* Markets — full width below */}
            <div className="mt-6">
              <MarketList />
            </div>
          </main>

          <footer className="border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-600">
            ArcIQ · Built on Arc Network (Chain ID 5042002) · Gas paid in USDC ·{" "}
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 underline"
            >
              ArcScan
            </a>
          </footer>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
