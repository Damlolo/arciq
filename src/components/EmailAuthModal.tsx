"use client";

import { useEffect, useRef, useState } from "react";
import { useCircleWalletContext } from "@/lib/circleWallet";

/**
 * Replaces the old wallet-picker modal. Just collects the email — Circle's
 * own hosted iframe takes over from there for OTP entry and (on first login)
 * PIN setup, appearing on top of this modal.
 */
export function EmailAuthModal() {
  const { modalOpen, closeModal, step, isBusy, error, loginWithEmail, setupPin, challengeActive } =
    useCircleWalletContext();
  const [emailInput, setEmailInput] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) closeModal();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  // Circle's own iframe is doing the work during the OTP step, and during
  // ANY active challenge (PIN setup, wallet creation) — get out of the way
  // so it's actually visible instead of sitting behind our own full-screen
  // backdrop. Outside of an active challenge (e.g. while we're just polling
  // for wallet provisioning to finish, which has no visible Circle UI of its
  // own) we show our own waiting state instead of going blank.
  if (!modalOpen || step === "authenticating" || challengeActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        ref={modalRef}
        className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up sm:animate-fade-scale"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Sign in</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Your wallet is created automatically — no extension needed
            </p>
          </div>
          <button
            onClick={closeModal}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {step === "needsWallet" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-600 text-center">Setting up your wallet…</p>
              <p className="text-[11px] text-gray-400 text-center">
                This can take up to 30 seconds the first time — no need to refresh.
              </p>
            </div>
          ) : step === "needsPin" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              {isBusy ? (
                <>
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-600 text-center">Waiting for your PIN entry…</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 text-center">
                    Your wallet exists, but it doesn't have a security PIN set yet — nothing can be signed until it does.
                  </p>
                  <button
                    onClick={() => setupPin()}
                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    Set up PIN
                  </button>
                </>
              )}
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!emailInput) return;
                try {
                  await loginWithEmail(emailInput);
                } catch {
                  // error is surfaced via context state below
                }
              }}
              className="space-y-3"
            >
              <input
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isBusy || !emailInput}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {isBusy ? "Sending code…" : "Continue with email"}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                We'll email you a code — enter it in the prompt that appears next.
                First-time sign-ins also set up a secure PIN for your wallet.
              </p>
            </form>
          )}

          {error && (
            <div className="mt-3 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
          <p className="text-[11px] text-gray-400 text-center">
            By continuing you agree to our{" "}
            <a href="#" className="text-blue-500 hover:underline">Terms of Service</a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fade-scale { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-slide-up   { animation: slide-up   0.25s cubic-bezier(0.32,0.72,0,1) both; }
        .animate-fade-scale { animation: fade-scale 0.2s  cubic-bezier(0.32,0.72,0,1) both; }
        @media (min-width: 640px) { .animate-slide-up { animation-name: fade-scale; } }
      `}</style>
    </div>
  );
}
