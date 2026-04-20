"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useLoanData, useBorrow, useRepay, useReputation, useVaultData } from "@/hooks/useProtocol";
import { formatUSDC, parseUSDC, scoreToMultiplier } from "@/lib/contracts";
import { useTheme } from "@/lib/theme";

export function BorrowPanel() {
  const { address } = useAccount();
  const { maxBorrow, principal, totalDue, hasLoan, healthFactor, refetch } = useLoanData();
  const { collateral } = useVaultData();
  const { score } = useReputation(address);
  const { borrow, isPending: borrowPending } = useBorrow();
  const { approveLending, repay, isPending: repayPending } = useRepay();
  const { dark } = useTheme();

  const [borrowAmount, setBorrowAmount] = useState("");
  const [status, setStatus] = useState("");

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  const txt = dark ? "text-gray-300" : "text-gray-600";
  const main = dark ? "text-white" : "text-gray-900";
  const mono = dark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-700";
  const inp = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-white border-gray-200 text-gray-900";
  const available = maxBorrow > principal ? maxBorrow - principal : 0n;

  const healthColor = healthFactor === Infinity ? "text-green-500" : healthFactor > 2 ? "text-green-500" : healthFactor > 1.2 ? "text-yellow-500" : "text-red-500";

  async function handleBorrow() {
    if (!borrowAmount) return;
    const parsed = parseUSDC(borrowAmount);
    if (parsed > available) { setStatus("Amount exceeds available capacity"); return; }
    try {
      setStatus("Borrowing…");
      await borrow(parsed);
      setStatus("Borrowed ✓"); setBorrowAmount(""); refetch();
    } catch (e: any) { setStatus("Error: " + (e?.shortMessage ?? e?.message)); }
  }

  async function handleRepay() {
    try {
      setStatus("Approving…");
      await approveLending(totalDue + totalDue / 100n);
      setStatus("Repaying…");
      await repay();
      setStatus("Repaid ✓"); refetch();
    } catch (e: any) { setStatus("Error: " + (e?.shortMessage ?? e?.message)); }
  }

  const tiers = [
    { score: 50, mult: "1.0×", ltv: 50 }, { score: 60, mult: "1.1×", ltv: 55 },
    { score: 70, mult: "1.2×", ltv: 60 }, { score: 80, mult: "1.3×", ltv: 65 },
    { score: 90, mult: "1.4×", ltv: 70 },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "Max borrow", v: `$${formatUSDC(maxBorrow)}`, c: "text-blue-500" },
          { l: "Available", v: `$${formatUSDC(available)}`, c: main },
          { l: "Health", v: hasLoan ? (healthFactor === Infinity ? "∞" : healthFactor.toFixed(2)) : "—", c: healthColor },
        ].map(s => (
          <div key={s.l} className={`rounded-xl border p-4 ${card}`}>
            <div className={`text-xs mb-1 ${sub}`}>{s.l}</div>
            <div className={`text-lg font-bold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Formula */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${sub}`}>Borrow Formula</p>
        <div className={`rounded-lg px-3 py-2.5 text-xs font-mono ${mono}`}>
          <div>Limit = Collateral × Base LTV × Score multiplier</div>
          <div className="mt-1 font-bold text-blue-400">
            = ${formatUSDC(collateral)} × 50% × {scoreToMultiplier(score)} = ${formatUSDC(maxBorrow)}
          </div>
        </div>
      </div>

      {/* Borrow / Repay */}
      <div className={`rounded-xl border p-5 ${card}`}>
        {!hasLoan ? (
          <>
            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Borrow USDC (5% APR)</p>
            <div className="flex gap-2">
              <input type="number" placeholder={`Max $${formatUSDC(available)}`} value={borrowAmount}
                onChange={e => setBorrowAmount(e.target.value)}
                className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inp}`} />
              <button onClick={handleBorrow} disabled={borrowPending || !borrowAmount || available === 0n}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40">
                {borrowPending ? "…" : "Borrow"}
              </button>
            </div>
            {available === 0n && <p className={`text-xs mt-2 ${sub}`}>Deposit collateral in the Vault to unlock borrowing.</p>}
          </>
        ) : (
          <>
            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Active Loan</p>
            <div className="space-y-2 mb-4">
              {[
                { l: "Principal", v: `$${formatUSDC(principal)}` },
                { l: "Total due", v: `$${formatUSDC(totalDue)}` },
                { l: "APR", v: "5.0%" },
              ].map(r => (
                <div key={r.l} className="flex justify-between text-sm">
                  <span className={sub}>{r.l}</span>
                  <span className={`font-semibold ${main}`}>{r.v}</span>
                </div>
              ))}
            </div>
            <button onClick={handleRepay} disabled={repayPending}
              className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors ${dark ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-900 text-white hover:bg-gray-700"} disabled:opacity-50`}>
              {repayPending ? "Repaying…" : `Repay $${formatUSDC(totalDue)}`}
            </button>
          </>
        )}
        {status && <p className={`text-xs mt-2 ${sub}`}>{status}</p>}
      </div>

      {/* Tier table */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wide border-b ${dark ? "border-gray-800 text-gray-400" : "border-gray-100 text-gray-500"}`}>Score → LTV Tiers</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className={dark ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-500"}>
              {["Score","Multiplier","Eff. LTV","On $500"].map(h => (
                <th key={h} className="py-2 px-3 text-left font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {tiers.map(t => {
                const active = score >= t.score && (t.score + 10 > score || t.score === 90);
                return (
                  <tr key={t.score} className={`border-t ${dark ? "border-gray-800" : "border-gray-50"} ${active ? dark ? "bg-blue-900/30" : "bg-blue-50" : ""}`}>
                    <td className={`py-2 px-3 ${active ? "text-blue-400 font-bold" : txt}`}>≥ {t.score}</td>
                    <td className={`py-2 px-3 font-bold ${active ? "text-blue-400" : "text-blue-500"}`}>{t.mult}</td>
                    <td className={`py-2 px-3 ${txt}`}>{t.ltv}%</td>
                    <td className={`py-2 px-3 ${txt}`}>${(500 * t.ltv / 100).toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
