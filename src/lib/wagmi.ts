import { createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { QueryClient } from "@tanstack/react-query";
import { ARC_TESTNET } from "./contracts";

// wagmi is now READS-ONLY. Writes/signing go through Circle User-Controlled
// Wallets — see src/lib/circleWallet.tsx. No connectors are registered here on
// purpose; useReadContract / usePublicClient work fine without a connected
// wallet, they just need an RPC transport, which is all this config provides.
//
// Arc Testnet's public RPC rate-limits aggressively. useProtocol() alone fires
// ~20-30 reads, and it's called independently by 8+ components — without the
// settings below, a single burst of 429s snowballs into a self-amplifying
// retry storm (react-query retries each failed query 3x by default, on top of
// viem's own transport-level retries, on top of every component remount
// triggering a fresh refetch because staleTime defaults to 0).

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,                 // don't compound failures into a retry storm
      staleTime: 20_000,        // reuse cached reads for 20s instead of refetching on every mount
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [ARC_TESTNET as any, hardhat],
  connectors: [],
  transports: {
    // NOTE: batch:true was tried here to reduce request count, but Arc
    // Testnet's public RPC appears not to support JSON-RPC batching properly —
    // batched reads came back empty with no visible error. Reverted; retryCount
    // + the query-client settings above do most of the real work anyway.
    [ARC_TESTNET.id]: http(ARC_TESTNET.rpcUrls.default.http[0], {
      retryCount: 1,
    }),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});
