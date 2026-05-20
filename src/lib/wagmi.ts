import { createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient } from "@tanstack/react-query";
import { ARC_TESTNET } from "./contracts";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  chains: [ARC_TESTNET as any, hardhat],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [ARC_TESTNET.id]: http(ARC_TESTNET.rpcUrls.default.http[0]),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});
