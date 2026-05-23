"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useProtocol } from "@/hooks/useProtocol";
import {
  CONTRACT_ADDRESSES,
  ERC20_ABI,
  PREDICTION_MARKET_ABI,
  formatUsdc,
  parseUsdc,
} from "@/lib/contracts";

const MIN_SCORE   = 75;
const CREATION_FEE = parseUsdc("1000");

// ─── Score gate screen ────────────────────────────────────────────────────
function ScoreGate({ score }: { score: number }) {
  const needed = MIN_SCORE - score;
  const pct    = Math.min((score / MIN_SCORE) * 100, 100);

  return (
    <div className="surface-card p-8 text-center flex flex-col items-center gap-5">
      {/* Lock icon */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
        <svg className="w-7 h-7" style={{ color: "var(--accent-secondary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      <div>
        <h2 className="text-[17px] font-black text-[var(--text-primary)] mb-2">ArcIQ Score Too Low</h2>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
          You need an ArcIQ score of{" "}
          <span className="font-bold" style={{ color: "var(--accent-secondary)" }}>{MIN_SCORE}+</span>{" "}
          to create markets. Your current score is{" "}
          <span className="font-bold text-[var(--text-primary)]">{score}</span>.
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-[12px] mb-2">
          <span className="text-[var(--text-muted)]">Your score</span>
          <span className="font-bold text-[var(--text-primary)]">{score} / {MIN_SCORE}</span>
        </div>
        <div className="progress-track h-2">
          <div className="progress-fill h-full"
            style={{
              width: `${pct}%`,
              background: pct >= 80
                ? "linear-gradient(90deg, #818CF8, #6366F1)"
                : "linear-gradient(90deg, #6366F1, #4F46E5)"
            }} />
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
          {needed} more points needed
        </p>
      </div>

      {/* How to unlock */}
      <div className="w-full rounded-xl p-4 text-left space-y-2.5"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">How to unlock</p>
        {[
          "Predict on markets in the Markets tab",
          "Win predictions to raise your ArcIQ score",
          `Reach score ≥ ${MIN_SCORE} to unlock market creation`,
          "You'll also need 1,000 USDC as a creation fee",
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5 text-[12px] text-[var(--text-secondary)]">
            <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
              style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent-secondary)" }}>
              {i + 1}
            </span>
            {tip}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────
export function CreateMarketPanel({ score }: { score: number; dark?: boolean }) {
  const { address }                    = useAccount();
  const { usdcBalance }                = useProtocol();
  const { writeContractAsync }         = useWriteContract();

  const [question, setQuestion] = useState("");
  const [days, setDays]         = useState("7");
  const [status, setStatus]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [step, setStep]         = useState<0 | 1 | 2>(0);

  const canCreate  = score >= MIN_SCORE;
  const hasBalance = usdcBalance >= CREATION_FEE;

  const closeDate = new Date(Date.now() + parseInt(days || "7") * 86_400_000)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  if (!canCreate) return <ScoreGate score={score} />;

  async function handleCreate() {
    if (!address)            { setStatus("Connect wallet first"); return; }
    if (!question.trim())    { setStatus("Enter a market question"); return; }
    if (!days || parseInt(days) < 1) { setStatus("Enter a valid number of days"); return; }
    if (!hasBalance)         { setStatus("You need at least 1,000 USDC to create a market"); return; }

    setLoading(true); setStatus(""); setSuccess(false);

    try {
      setStep(1);
      setStatus("Step 1/2 — Approving 1,000 USDC…");
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.usdc as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.predictionMarket as `0x${string}`, CREATION_FEE],
      });

      setStep(2);
      const endTime = BigInt(Math.floor(Date.now() / 1000) + parseInt(days) * 86_400);
      setStatus("Step 2/2 — Creating market on chain…");
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.predictionMarket as `0x${string}`,
        abi: [{
          name: "createUserMarket", type: "function", stateMutability: "nonpayable",
          inputs: [{ name: "question", type: "string" }, { name: "endTime", type: "uint256" }],
          outputs: [{ name: "id", type: "uint256" }],
        }] as const,
        functionName: "createUserMarket",
        args: [question.trim(), endTime],
      });

      setStep(0); setStatus(""); setSuccess(true);
      setQuestion(""); setDays("7");
    } catch (e: any) {
      setStep(0);
      const msg: string = e?.cause?.reason ?? e?.shortMessage ?? e?.message ?? "Transaction failed";
      setStatus(msg.includes("user rejected") || msg.includes("User denied") ? "Transaction cancelled." : msg);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Unlocked banner */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <svg className="w-4 h-4 shrink-0" style={{ color: "var(--yes-color)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--yes-color)" }}>
            Market creation unlocked · ArcIQ {score}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            A 1,000 USDC fee is charged per market
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="surface-card p-5 space-y-5">

        {/* Question input */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Market Question
          </label>
          <textarea
            rows={3}
            placeholder='e.g. "Will RAVE hit $50 by May 10, 2026?"'
            value={question}
            onChange={e => setQuestion(e.target.value)}
            maxLength={200}
            className="premium-input resize-none text-[13px] leading-relaxed"
            style={{ minHeight: "84px" }}
          />
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Keep it a clear YES/NO question</span>
            <span className={question.length > 180 ? "text-[var(--no-color)]" : "text-[var(--text-muted)]"}>
              {question.length}/200
            </span>
          </div>
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Duration
          </label>
          <div className="flex gap-1.5">
            {["1", "3", "7", "14", "30"].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all border"
                style={days === d ? {
                  background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                  color: "#fff",
                  borderColor: "#6366F1",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.35)"
                } : {
                  background: "var(--bg-elevated)",
                  color: "var(--text-muted)",
                  borderColor: "var(--border-default)"
                }}
              >
                {d}d
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Closes: <span className="text-[var(--text-secondary)] font-semibold">{closeDate}</span>
          </p>
        </div>

        {/* Fee summary */}
        <div className="rounded-xl p-4 space-y-2.5"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">Summary</p>
          {[
            { label: "Creation fee",   value: "1,000 USDC",              color: "var(--text-primary)" },
            { label: "Your balance",   value: `${formatUsdc(usdcBalance)} USDC`, color: hasBalance ? "var(--yes-color)" : "var(--no-color)" },
            { label: "Market closes",  value: closeDate,                 color: "var(--text-secondary)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-muted)]">{label}</span>
              <span className="font-semibold" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Insufficient balance warning */}
        {!hasBalance && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-2.5 text-[12px]"
            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "var(--no-color)" }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Insufficient balance. Get testnet USDC from the Faucet tab.
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-2.5 text-[12px]"
            style={{ background: "var(--yes-glow)", border: "1px solid rgba(16,185,129,0.25)", color: "var(--yes-color)" }}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Market created! It will appear in the Markets tab shortly.
          </div>
        )}

        {/* Status / in-progress steps */}
        {loading && (
          <div className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            {[
              { n: 1, label: "Approve 1,000 USDC" },
              { n: 2, label: "Create market on chain" },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-2.5 text-[12px]">
                {step > s.n ? (
                  <svg className="w-4 h-4 shrink-0" style={{ color: "var(--yes-color)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : step === s.n ? (
                  <svg className="w-4 h-4 shrink-0 animate-spin" style={{ color: "var(--accent-secondary)" }} viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <div className="w-4 h-4 rounded-full shrink-0"
                    style={{ border: "1.5px solid var(--border-strong)" }} />
                )}
                <span style={{
                  color: step === s.n ? "var(--text-primary)"
                    : step > s.n ? "var(--yes-color)"
                    : "var(--text-muted)"
                }}>
                  Step {s.n}: {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {status && !loading && !success && (
          <p className="text-[12px] text-center" style={{ color: "var(--no-color)" }}>{status}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={loading || !hasBalance || !question.trim()}
          className="btn-primary w-full py-3.5 text-[14px] disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Confirming…
            </span>
          ) : "Create Market — 1,000 USDC"}
        </button>
      </div>

      {/* How it works */}
      <div className="surface-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">
          How user markets work
        </p>
        <div className="space-y-2.5">
          {[
            { icon: "💸", text: "Your 1,000 USDC fee goes to the protocol treasury" },
            { icon: "🗳️", text: "Other users stake YES or NO on your question" },
            { icon: "⏱️", text: "You must resolve the market after it ends" },
            { icon: "🏆", text: "Winners split the pool proportional to their stake" },
            { icon: "📈", text: "Correct predictions boost all participants' ArcIQ scores" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3 text-[12px] text-[var(--text-secondary)]">
              <span className="text-base shrink-0 leading-tight">{icon}</span>
              <span className="leading-relaxed">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
