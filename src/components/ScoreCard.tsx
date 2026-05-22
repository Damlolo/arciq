"use client";

import { useProtocol } from "../hooks/useProtocol";
import { yieldMultiplierLabel, ltvLabel, formatUsdc } from "../lib/contracts";

// ─── Tier config ──────────────────────────────────────────────────────────────
function tierConfig(score: number) {
  if (score >= 90) return { label: "Elite",    color: "#A78BFA", track: "#A78BFA", glow: "rgba(167,139,250,0.2)" };
  if (score >= 70) return { label: "Advanced", color: "#38BDF8", track: "#38BDF8", glow: "rgba(56,189,248,0.15)" };
  if (score >= 50) return { label: "Standard", color: "#818CF8", track: "#818CF8", glow: "rgba(99,102,241,0.15)" };
  return           { label: "Beginner",  color: "#94A3B8", track: "#64748B", glow: "rgba(100,116,139,0.1)" };
}

// ─── ScoreCard ────────────────────────────────────────────────────────────────
export function ScoreCard() {
  const { score, yieldMultiplier, ltvPct, isElite, eliteBonusPool } = useProtocol();
  const tier = tierConfig(score);

  const r           = 46;
  const circ        = 2 * Math.PI * r;
  const progress    = (score / 100) * circ;
  const gap         = 8;                        // small gap at start
  const dashOffset  = -(circ * 0.25) + gap;     // start at top

  return (
    <div className="glass-card p-6 flex flex-col gap-5 relative overflow-hidden">
      {/* Subtle glow bg */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{ background: `radial-gradient(ellipse at 20% 20%, ${tier.glow} 0%, transparent 60%)` }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-muted)]">ArcIQ Score</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Your on-chain reputation</p>
        </div>
        {isElite && (
          <span className="badge badge-elite">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Elite
          </span>
        )}
      </div>

      {/* Score ring + stats */}
      <div className="relative flex items-center gap-6">
        {/* SVG ring */}
        <div className="relative shrink-0 w-[108px] h-[108px]">
          {/* Glow */}
          <div
            className="absolute inset-0 rounded-full blur-lg opacity-40 scale-75"
            style={{ background: tier.glow }}
          />
          <svg viewBox="0 0 100 100" className="w-full h-full relative">
            {/* Track */}
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
            {/* Progress */}
            <circle
              cx="50" cy="50" r={r}
              fill="none"
              stroke={tier.track}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circ}`}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${tier.color}80)` }}
            />
            {/* Tick marks at tier boundaries */}
            {[50, 70, 90].map((t) => {
              const angle = ((t / 100) * 360 - 90) * (Math.PI / 180);
              const cx2   = 50 + r * Math.cos(angle);
              const cy2   = 50 + r * Math.sin(angle);
              return (
                <circle key={t} cx={cx2} cy={cy2} r="2" fill={t <= score ? tier.color : "rgba(255,255,255,0.12)"} />
              );
            })}
          </svg>
          {/* Centre label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-black leading-none" style={{ color: tier.color }}>{score}</span>
            <span className="text-[10px] text-[var(--text-muted)] mt-0.5">/100</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-2.5 flex-1">
          {[
            { label: "Tier",            val: tier.label,                 color: tier.color },
            { label: "Yield multiplier", val: yieldMultiplierLabel(score), color: "var(--yes-color)" },
            { label: "Max LTV",         val: ltvLabel(score),            color: "var(--text-primary)" },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
              <span className="text-[13px] font-bold" style={{ color }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tier gradient bar */}
      <div className="space-y-1.5">
        <div className="h-1.5 rounded-full overflow-hidden flex gap-0.5">
          {[
            { color: "#94A3B8", w: 50 },
            { color: "#818CF8", w: 20 },
            { color: "#38BDF8", w: 20 },
            { color: "#A78BFA", w: 10 },
          ].map(({ color, w }, i) => (
            <div key={i} className="rounded-full transition-all" style={{ background: color, width: `${w}%`, opacity: 0.5 + (i * 0.15) }} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>0 Beginner</span>
          <span>50 Standard</span>
          <span>70 Advanced</span>
          <span>90 Elite</span>
        </div>
      </div>

      {/* Elite bonus pool banner */}
      {isElite && eliteBonusPool > 0n && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-[11px] text-violet-400 font-semibold">Elite Bonus Pool</p>
              <p className="text-[10px] text-[var(--text-muted)]">Exclusive to 90+ scorers</p>
            </div>
          </div>
          <span className="text-sm font-black text-violet-300">${formatUsdc(eliteBonusPool)}</span>
        </div>
      )}
    </div>
  );
}
