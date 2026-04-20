"use client";
import { useTheme } from "@/lib/theme";

function DepositIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 2v13M7 11l5 5 5-5"/><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/>
  </svg>;
}
function PredictIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>;
}
function WinIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>;
}
function ScoreIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>;
}
function BorrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>;
}
function ArrowIcon({ dark }: { dark: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    className={`w-3 h-3 shrink-0 ${dark ? "text-gray-700" : "text-gray-300"}`}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>;
}
function LoopIcon({ dark }: { dark: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    className={`w-3 h-3 shrink-0 ${dark ? "text-gray-700" : "text-gray-300"}`}>
    <polyline points="17 2 21 6 17 10"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 22 3 18 7 14"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>;
}

export function LoopFlow() {
  const { dark } = useTheme();

  const iconBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const iconColor = dark ? "text-gray-400" : "text-gray-500";
  const labelColor = dark ? "text-gray-500" : "text-gray-400";
  const subColor = dark ? "text-gray-700" : "text-gray-300";

  const steps = [
    { icon: <DepositIcon />, label: "Deposit USDC", sub: "collateral" },
    { icon: <PredictIcon />, label: "Predict markets", sub: "YES / NO" },
    { icon: <WinIcon />, label: "Win predictions", sub: "correct forecast" },
    { icon: <ScoreIcon />, label: "Score rises", sub: "ArcIQ EMA" },
    { icon: <BorrowIcon />, label: "Borrow more", sub: "higher LTV" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap px-4">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-2 ${iconBg} ${iconColor}`}>
              {s.icon}
            </div>
            <span className={`text-xs font-medium ${labelColor} text-center leading-tight`}>{s.label}</span>
            <span className={`text-xs ${subColor} text-center`}>{s.sub}</span>
          </div>
          {i < steps.length - 1
            ? <div className="pb-6"><ArrowIcon dark={dark} /></div>
            : <div className="pb-6"><LoopIcon dark={dark} /></div>
          }
        </div>
      ))}
    </div>
  );
}
