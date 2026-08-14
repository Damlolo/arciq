import { createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient } from "@tanstack/react-query";
import { ARC_TESTNET } from "./contracts";

// wagmi handles TWO separate things now:
//  1. Reads (useReadContract / usePublicClient) — used for every user,
//     regardless of how they signed in. These just need an RPC transport.
//  2. Writes for the "connect an existing wallet" path (MetaMask, Rabby, OKX,
//     Zerion, WalletConnect, ...) — a path that bypasses Circle entirely. See
//     src/lib/circleWallet.tsx, which merges this wagmi connection state with
//     Circle's own session so the rest of the app doesn't need to care which
//     one is active.
//
// `injected()` covers any EIP-1193 browser wallet exposed as window.ethereum.
// wagmi's `multiInjectedProviderDiscovery` (on by default in createConfig)
// separately auto-detects EIP-6963-announcing extensions (Rabby, OKX, Zerion,
// MetaMask, etc.) as their OWN distinct connectors — each with its real name
// and icon supplied by the wallet itself — so we don't need to hardcode a
// `window.<walletname>` global per wallet and risk guessing wrong.
//
// WalletConnect needs a project ID from https://cloud.walletconnect.com — only
// registered if NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set, so a missing env
// var can't crash the app; the QR-code option just won't appear until it's set.
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

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
  connectors: [
    injected(),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
      : []),
  ],
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
