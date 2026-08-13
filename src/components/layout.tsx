import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lendiq — Predict smarter. Borrow better.",
  description:
    "DeFi protocol combining prediction markets, behavioral credit scoring, and multi-source yield on Arc Network.",
  keywords: ["DeFi", "prediction markets", "lending", "yield", "Arc Network", "USDC"],
  openGraph: {
    title: "Lendiq",
    description: "Predict smarter. Borrow better.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
