"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig, queryClient } from "@/lib/wagmi";
import { CircleWalletProvider } from "@/lib/circleWallet";
import { EmailAuthModal } from "@/components/EmailAuthModal";

// ── Theme context ─────────────────────────────────────────────────────────────
interface ThemeCtx { isDark: boolean; toggle: () => void; }
export const ThemeContext = createContext<ThemeCtx>({ isDark: true, toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }

// ── Providers ────────────────────────────────────────────────────────────────
export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Initialise from localStorage; fall back to dark
  const [isDark, setIsDark] = useState(true);

  // On first mount: read saved preference or system preference
  useEffect(() => {
    const saved = localStorage.getItem("lendiq-theme");
    if (saved === "light") {
      setIsDark(false);
    } else if (saved === "dark") {
      setIsDark(true);
    } else {
      // No preference saved — use system default
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(prefersDark);
    }
    setMounted(true);
  }, []);

  // Apply class to <html> whenever isDark changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("light");
    } else {
      root.classList.add("light");
    }
    // Persist
    if (mounted) {
      localStorage.setItem("lendiq-theme", isDark ? "dark" : "light");
    }
  }, [isDark, mounted]);

  function toggle() { setIsDark(p => !p); }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <CircleWalletProvider>
            {/* Prevent flash of wrong theme — render nothing until mounted */}
            {mounted ? children : null}
            <EmailAuthModal />
          </CircleWalletProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeContext.Provider>
  );
}
