"use client";

export function LoopFlow() {
  const steps = [
    { icon: "💵", label: "Deposit USDC", sub: "Earn yield on idle collateral", color: "border-blue-500/40 bg-blue-500/5" },
    { icon: "🎯", label: "Predict markets", sub: "Stake on YES / NO outcomes", color: "border-emerald-500/40 bg-emerald-500/5" },
    { icon: "⬆️", label: "Win → score rises", sub: "EMA pushes your Lendiq up", color: "border-amber-500/40 bg-amber-500/5" },
    { icon: "📈", label: "Higher yield & LTV", sub: "Up to 1.6× yield, 70% LTV", color: "border-violet-500/40 bg-violet-500/5" },
    { icon: "🏦", label: "Borrow more", sub: "Score-weighted credit line", color: "border-rose-500/40 bg-rose-500/5" },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">The Flywheel</h2>

      <div className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-xl border ${step.color} flex items-center justify-center text-lg shrink-0`}>
                {step.icon}
              </div>
              {i < steps.length - 1 && (
                <div className="w-px h-4 bg-gray-700 mt-1" />
              )}
            </div>
            <div className="pt-2">
              <p className="text-sm font-medium text-white">{step.label}</p>
              <p className="text-xs text-gray-500">{step.sub}</p>
            </div>
          </div>
        ))}

        {/* Loop arrow back to start */}
        <div className="flex items-center gap-3 mt-1">
          <div className="w-10 flex justify-center">
            <div className="text-gray-600 text-lg">↺</div>
          </div>
          <p className="text-xs text-gray-600 italic">Repeats — each cycle compounds your position</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        {[
          { label: "Base yield", value: "~4–6%", note: "External DeFi" },
          { label: "Elite boost", value: "+60%", note: "Score ≥ 90" },
          { label: "Elite pool", value: "+bonus", note: "10% pred. fees" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-sm font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
