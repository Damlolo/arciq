"use client";

import { useEffect, useRef, useState } from "react";
import { useConnectors } from "wagmi";
import { useCircleWalletContext } from "@/lib/circleWallet";

/**
 * The one sign-in surface for the whole app. Three ways in:
 *  1. Google (Circle-managed wallet, via Circle's own OAuth redirect flow)
 *  2. Email OTP (Circle-managed wallet, Circle's hosted iframe)
 *  3. Connect an existing wallet (MetaMask/Rabby/OKX/Zerion/WalletConnect —
 *     bypasses Circle entirely, see src/lib/circleWallet.tsx)
 * Circle's own hosted iframe takes over on top of this modal for OTP entry,
 * the Google redirect, and (on first login) PIN setup.
 */

// ── Known-wallet display metadata — used only to pick a nicer name/icon than
//    whatever a connector announces by default. Any OTHER EIP-6963 wallet
//    the browser detects (MetaMask, Rainbow, Brave, etc.) still shows up
//    automatically via wagmi's useConnectors(), just with its own name/icon
//    supplied directly by that wallet extension instead of one of these.
const KNOWN_WALLETS: Record<string, { label: string; logoUrl: string; description: string }> = {
  walletconnect: { label: "WalletConnect", logoUrl: "/wallets/walletconnect.png", description: "Scan with any wallet" },
  rabby: { label: "Rabby Wallet", logoUrl: "/wallets/rabby.png", description: "The wallet for DeFi" },
  okx: { label: "OKX Wallet", logoUrl: "/wallets/okx.png", description: "Your Web3 gateway" },
  zerion: { label: "Zerion", logoUrl: "/wallets/zerion.png", description: "Invest in DeFi" },
};

function matchKnownWallet(name: string) {
  const key = name.toLowerCase();
  return Object.entries(KNOWN_WALLETS).find(([id]) => key.includes(id))?.[1] ?? null;
}

// Falls back to a letter avatar if a logo URL 404s or a connector has no icon at all.
function WalletLogo({ name, logoUrl, size = 36 }: { name: string; logoUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
      >
        {name[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={logoUrl}
      alt={name}
      width={size}
      height={size}
      className="rounded-xl object-contain flex-shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

export function EmailAuthModal() {
  const {
    modalOpen,
    closeModal,
    step,
    isBusy,
    error,
    loginWithEmail,
    loginWithGoogle,
    connectExternalWallet,
    setupPin,
    challengeActive,
  } = useCircleWalletContext();
  const [emailInput, setEmailInput] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Real, currently-available connectors — injected wallets detected via
  // EIP-6963 (Rabby/OKX/Zerion/MetaMask/etc, each announcing its own name +
  // icon), plus WalletConnect if NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set.
  // The generic catch-all "Injected" connector is skipped when at least one
  // real EIP-6963 wallet was detected, since it's almost always a duplicate
  // of one of those rather than a genuinely separate option.
  const allConnectors = useConnectors();
  const named = allConnectors.filter((c) => c.type !== "injected" || c.name !== "Injected");
  const walletConnectors = named.length > 0 ? named : allConnectors;

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

  // Circle's own iframe is doing the work during the OTP step, the Google
  // redirect, and ANY active challenge (PIN setup, wallet creation) — get
  // out of the way so it's actually visible instead of sitting behind our
  // own full-screen backdrop. Outside of an active challenge (e.g. while
  // we're just polling for wallet provisioning to finish, which has no
  // visible Circle UI of its own) we show our own waiting state instead of
  // going blank.
  if (!modalOpen || step === "authenticating" || challengeActive) return null;

  const showAuthOptions = step !== "needsWallet" && step !== "needsPin";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        ref={modalRef}
        className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up sm:animate-fade-scale max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Sign in</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {showAuthOptions ? "Choose how you'd like to continue" : "Your wallet is created automatically"}
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

        <div className="px-5 py-5 overflow-y-auto">
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
            <div className="space-y-4">
              {/* ── Google ────────────────────────────────────────────────── */}
              <button
                onClick={() => loginWithGoogle()}
                disabled={isBusy}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"/>
                  <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* ── Email ─────────────────────────────────────────────────── */}
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
              </form>

              {/* ── Connect an existing wallet ───────────────────────────── */}
              {walletConnectors.length > 0 && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[11px] text-gray-400">or connect a wallet</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <div className="space-y-1">
                    {walletConnectors.map((connector) => {
                      const known = matchKnownWallet(connector.name);
                      const label = known?.label ?? connector.name;
                      const logoUrl = known?.logoUrl ?? (connector as any).icon ?? null;
                      const isConnecting = connectingId === connector.uid && isBusy;

                      return (
                        <button
                          key={connector.uid}
                          disabled={isConnecting}
                          onClick={async () => {
                            setConnectingId(connector.uid);
                            try {
                              await connectExternalWallet(connector);
                            } finally {
                              setConnectingId(null);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left disabled:opacity-60 disabled:cursor-wait"
                        >
                          <WalletLogo name={label} logoUrl={logoUrl} size={32} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">{label}</span>
                            {known?.description && (
                              <p className="text-[11px] text-gray-400 truncate">{known.description}</p>
                            )}
                          </div>
                          {isConnecting && (
                            <svg className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="text-[11px] text-gray-400 text-center">
                Signing in with email or Google creates a secure wallet for you automatically.
                Connecting a wallet uses the one you already have instead.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex-shrink-0">
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
