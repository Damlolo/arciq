"use client";
import { useLoanData } from "@/hooks/useProtocol";
import { formatUSDC } from "@/lib/contracts";
import { useTheme } from "@/lib/theme";

export function LoanCard() {
  const { principal, interest, totalDue, healthFactor, hasLoan, maxBorrow } = useLoanData();
  const { dark } = useTheme();

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const label = dark ? "text-gray-400" : "text-gray-400";
  const main = dark ? "text-white" : "text-gray-900";

  const healthColor = healthFactor === Infinity ? "text-green-500"
    : healthFactor > 2 ? "text-green-500"
    : healthFactor > 1.2 ? "text-yellow-500" : "text-red-500";

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <div className={`text-xs font-medium uppercase tracking-wide mb-3 ${label}`}>Active Loan</div>
      {hasLoan ? (
        <>
          <div className={`text-3xl font-semibold mb-1 ${main}`}>${formatUSDC(principal)}</div>
          <div className={`text-sm mb-4 ${label}`}>+${formatUSDC(interest)} interest</div>
          <div className="space-y-2">
            {[
              { l: "Total due", v: `$${formatUSDC(totalDue)}`, c: main },
              { l: "Health factor", v: healthFactor === Infinity ? "∞" : healthFactor.toFixed(2), c: healthColor },
              { l: "APR", v: "5.0%", c: main },
            ].map(r => (
              <div key={r.l} className="flex justify-between text-sm">
                <span className={label}>{r.l}</span>
                <span className={`font-medium ${r.c}`}>{r.v}</span>
              </div>
            ))}
          </div>
          {healthFactor < 1.2 && (
            <div className="mt-3 bg-red-900/30 text-red-400 text-xs rounded-lg px-3 py-2">
              ⚠️ Position at risk. Repay to avoid liquidation.
            </div>
          )}
        </>
      ) : (
        <>
          <div className={`text-3xl font-semibold mb-1 ${main}`}>$0</div>
          <div className={`text-sm mb-4 ${label}`}>No active loan</div>
          <div className="flex justify-between text-sm">
            <span className={label}>Max borrow</span>
            <span className="font-medium text-blue-500">${formatUSDC(maxBorrow)}</span>
          </div>
          <div className={`mt-3 text-xs ${label}`}>Improve your ArcIQ score to unlock more borrowing.</div>
        </>
      )}
    </div>
  );
}
