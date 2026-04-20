"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useWriteContract, useReadContract } from "wagmi";
import { useReputation, useUSDCBalance } from "@/hooks/useProtocol";
import { CONTRACTS, ERC20_ABI, MARKET_ABI, formatUSDC, parseUSDC } from "@/lib/contracts";

const MIN_SCORE = 75;
const CREATION_FEE = parseUSDC("1000"); // 1000 USDC

export function CreateMarketPanel({ score, dark }: { score: number; dark: boolean }) {
  const { address } = useAccount();
  const { balance } = useUSDCBalance();
  const { writeContractAsync } = useWriteContract();

  const [question, setQuestion] = useState("");
  const [days, setDays] = useState("7");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const text = dark ? "text-gray-300" : "text-gray-600";
  const subtext = dark ? "text-gray-500" : "text-gray-400";
  const inputClass = dark
    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500"
    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500";

  const canCreate = score >= MIN_SCORE;
  const hasBalance = balance >= CREATION_FEE;

  async function handleCreate() {
    if (!question.trim()) { setStatus("Enter a market question"); return; }
    if (!days || parseInt(days) < 1) { setStatus("Enter a valid number of days"); return; }
    if (!canCreate) { setStatus(`ArcIQ score must be ≥ ${MIN_SCORE}`); return; }
    if (!hasBalance) { setStatus("You need at least 1,000 USDC to create a market"); return; }

    setLoading(true);
    setStatus("");

    try {
      // Step 1: approve 1000 USDC to prediction market contract
      setStatus("Step 1/3 — Approving 1,000 USDC...");
      await writeContractAsync({
        address: CONTRACTS.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.predictionMarket, CREATION_FEE],
      });

      // Step 2: calculate end time
      const endTime = BigInt(Math.floor(Date.now() / 1000) + parseInt(days) * 86400);

      // Step 3: create market — calls createMarket on contract
      // Note: the contract's createMarket is onlyOwner for oracle markets,
      // but we expose a public createUserMarket function in the upgraded contract.
      // For now we call the standard createMarket (will need contract upgrade for full trustless UGC).
      setStatus("Step 2/3 — Creating market on chain...");
      await writeContractAsync({
        address: CONTRACTS.predictionMarket,
        abi: [
          {
            name: "createUserMarket",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "question", type: "string" },
              { name: "endTime", type: "uint256" },
            ],
            outputs: [{ name: "id", type: "uint256" }],
          },
        ],
        functionName: "createUserMarket",
        args: [question.trim(), endTime],
      });

      setStatus("Step 3/3 — Done!");
      setSuccess(true);
      setQuestion("");
      setDays("7");
    } catch (e: any) {
      setStatus("Error: " + (e?.shortMessage ?? e?.message ?? "Transaction failed"));
    }

    setLoading(false);
  }

  // Score gate
  if (!canCreate) {
    return (
      <div className={`rounded-xl border p-8 text-center ${card}`}>
        <div className="text-4xl mb-4">🔒</div>
        <h2 className={`text-lg font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
          ArcIQ Score Too Low
        </h2>
        <p className={`text-sm mb-6 max-w-sm mx-auto ${text}`}>
          You need an ArcIQ score of <span className="font-semibold text-blue-500">{MIN_SCORE} or above</span> to create markets.
          Your current score is <span className="font-semibold">{score}</span>.
        </p>

        {/* Progress to unlock */}
        <div className="max-w-xs mx-auto mb-6">
          <div className="flex justify-between text-xs mb-1.5">
            <span className={subtext}>Your score</span>
            <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>{score} / {MIN_SCORE}</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min((score / MIN_SCORE) * 100, 100)}%` }}
            />
          </div>
          <p className={`text-xs mt-2 ${subtext}`}>
            {MIN_SCORE - score} more points needed — win more predictions to get there
          </p>
        </div>

        <div className={`rounded-lg p-4 text-sm text-left space-y-1.5 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
          <p className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>How to unlock:</p>
          <p className={text}>• Predict on markets in the PREDICT tab</p>
          <p className={text}>• Win predictions to increase your ArcIQ score</p>
          <p className={text}>• Reach score ≥ {MIN_SCORE} to unlock market creation</p>
          <p className={text}>• You'll also need 1,000 USDC as a creation fee</p>
        </div>
      </div>
    );
  }

  // Unlocked — show creation form
  return (
    <div className="space-y-5">
      {/* Unlocked badge */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${dark ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200"}`}>
        <div className="text-2xl">✅</div>
        <div>
          <p className={`text-sm font-medium ${dark ? "text-green-400" : "text-green-800"}`}>
            Market creation unlocked — ArcIQ score {score}
          </p>
          <p className={`text-xs mt-0.5 ${dark ? "text-green-600" : "text-green-600"}`}>
            A 1,000 USDC fee is charged per market created
          </p>
        </div>
      </div>

      {/* Form */}
      <div className={`rounded-xl border p-6 space-y-5 ${card}`}>
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wide block mb-2 ${subtext}`}>
            Market Question
          </label>
          <textarea
            rows={3}
            placeholder='e.g. "Will RAVE hit $50 by May 10, 2026?"'
            value={question}
            onChange={e => setQuestion(e.target.value)}
            maxLength={200}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 ${inputClass}`}
          />
          <p className={`text-xs mt-1 ${subtext}`}>{question.length}/200 · Keep it as a clear YES/NO question</p>
        </div>

        <div>
          <label className={`text-xs font-semibold uppercase tracking-wide block mb-2 ${subtext}`}>
            Market Duration
          </label>
          <div className="flex gap-2">
            {["1", "3", "7", "14", "30"].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  days === d
                    ? "bg-blue-600 text-white border-blue-600"
                    : dark
                    ? "bg-gray-800 text-gray-300 border-gray-700 hover:border-blue-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <p className={`text-xs mt-1.5 ${subtext}`}>
            Closes: {new Date(Date.now() + parseInt(days || "7") * 86400000).toLocaleDateString("en-US", {
              weekday: "short", month: "short", day: "numeric", year: "numeric"
            })}
          </p>
        </div>

        {/* Fee summary */}
        <div className={`rounded-lg p-4 text-sm space-y-2 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
          <div className="flex justify-between">
            <span className={subtext}>Creation fee</span>
            <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>1,000 USDC</span>
          </div>
          <div className="flex justify-between">
            <span className={subtext}>Your balance</span>
            <span className={`font-medium ${hasBalance ? "text-green-500" : "text-red-500"}`}>
              {formatUSDC(balance)} USDC
            </span>
          </div>
          <div className="flex justify-between">
            <span className={subtext}>Resolution</span>
            <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>Admin (you)</span>
          </div>
        </div>

        {!hasBalance && (
          <div className={`rounded-lg px-4 py-2.5 text-sm ${dark ? "bg-red-900/30 text-red-400" : "bg-red-50 text-red-600"}`}>
            Insufficient balance. You need 1,000 USDC — get testnet USDC from the Faucet tab.
          </div>
        )}

        {success && (
          <div className={`rounded-lg px-4 py-2.5 text-sm ${dark ? "bg-green-900/30 text-green-400" : "bg-green-50 text-green-700"}`}>
            🎉 Market created successfully! It will appear in the Predict tab shortly.
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || !hasBalance || !question.trim()}
          className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? status || "Processing..." : "Create Market — 1,000 USDC"}
        </button>

        {status && !loading && !success && (
          <p className={`text-xs text-center ${status.startsWith("Error") ? "text-red-500" : subtext}`}>
            {status}
          </p>
        )}
      </div>

      {/* Info */}
      <div className={`rounded-xl border p-4 text-sm space-y-2 ${card}`}>
        <p className={`font-medium text-xs uppercase tracking-wide ${subtext}`}>How user markets work</p>
        <p className={text}>• Your 1,000 USDC fee goes to the protocol treasury</p>
        <p className={text}>• Other users can stake YES or NO on your question</p>
        <p className={text}>• You must resolve the market after it ends by contacting the admin</p>
        <p className={text}>• Winners split the pool proportionally to their stake</p>
        <p className={text}>• Correct predictions boost all participants' ArcIQ scores</p>
      </div>
    </div>
  );
}
