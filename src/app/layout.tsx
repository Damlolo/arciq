import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ArcIQ — Predict smarter. Borrow better.",
  description: "Prediction markets that unlock DeFi credit. Stake USDC, forecast outcomes, build your ArcIQ score, and borrow more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* No bg/text classes here — globals.css + Providers handle theming */}
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
