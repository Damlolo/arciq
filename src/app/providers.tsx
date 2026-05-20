"use client";
import { useState, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig, queryClient } from "@/lib/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Toggle .light on <html> — globals.css reads this to flip all hardcoded dark classes
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("light");
    } else {
      root.classList.add("light");
    }
  }, [isDark]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(p => !p) }}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {mounted ? children : null}
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeContext.Provider>
  );
}

import { createContext, useContext } from "react";
interface ThemeCtx { isDark: boolean; toggle: () => void; }
export const ThemeContext = createContext<ThemeCtx>({ isDark: true, toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }
