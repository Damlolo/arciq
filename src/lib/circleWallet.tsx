"use client";

/**
 * Circle User-Controlled Wallets — auth + wallet context.
 *
 * Auth is 100% Circle-native now: their SDK's own email-OTP login
 * (createDeviceTokenForEmailLogin + sdk.verifyOtp()) — no Supabase, no
 * app-managed userId. Circle looks up/creates the underlying user by email.
 *
 * Session persistence: Circle's userToken expires after 60 minutes, so we
 * store {userToken, encryptionKey, refreshToken, deviceId, address, walletId}
 * in localStorage and, on mount, try to silently restore the session —
 * refreshing the token first if it's gone stale — instead of forcing a fresh
 * email login on every page reload.
 *
 * IMPORTANT: this file intentionally exports hooks named useAccount / useConnect /
 * useDisconnect / useWriteContract / useChainId that MATCH wagmi's v2 shape.
 * Components that used to `import { useAccount } from "wagmi"` now
 * `import { useAccount } from "@/lib/circleWallet"` — one-line swap, no JSX changes.
 *
 * Reads (useReadContract, usePublicClient) are UNCHANGED and still come from wagmi —
 * those don't need a signer, just an RPC connection (see lib/wagmi.ts).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { encodeFunctionData, type Abi } from "viem";
import { ARC_TESTNET } from "./contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthStep =
  | "signedOut"      // nobody logged in
  | "restoring"      // checking a stored session on page load
  | "authenticating" // email submitted — Circle's own OTP iframe is showing
  | "needsWallet"    // logged in, Circle wallet not created yet (PIN setup pending)
  | "needsPin"       // wallet exists, but no PIN was ever actually set — can't sign anything yet
  | "ready";         // wallet exists AND a real PIN is set

interface StoredSession {
  userToken: string;
  encryptionKey: string;
  refreshToken: string;
  deviceId: string;
  address: `0x${string}`;
  walletId: string;
  email: string | null;
}

interface CircleWalletState {
  step: AuthStep;
  email: string | null;
  address: `0x${string}` | null;
  walletId: string | null;
  isBusy: boolean;
  error: string | null;
  modalOpen: boolean;
  /** True for the entire time a Circle challenge iframe (PIN setup, wallet
   *  creation, transaction confirm) is expected to be up and waiting for
   *  user input. EmailAuthModal must get out of the way (return null)
   *  whenever this is true, or its own full-screen overlay renders on top
   *  of and hides Circle's real prompt — exactly like it already does for
   *  the "authenticating" OTP step, just applied everywhere a challenge runs. */
  challengeActive: boolean;
}

interface CircleWalletContextValue extends CircleWalletState {
  openModal: () => void;
  closeModal: () => void;
  /** Starts Circle's native email-OTP login — opens their hosted OTP iframe. */
  loginWithEmail: (email: string) => Promise<void>;
  /** Re-runs the PIN-setup challenge for a wallet that exists but has no
   *  working PIN yet. Exposed so the UI can offer a retry when step is
   *  "needsPin" — this state can otherwise be a dead end (e.g. after a
   *  reload, or if the challenge iframe was closed/interrupted last time). */
  setupPin: () => Promise<void>;
  logout: () => void;
  writeContract: (params: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
  }) => Promise<`0x${string}`>;
}

const CircleWalletContext = createContext<CircleWalletContextValue | null>(null);

export function useCircleWalletContext() {
  const ctx = useContext(CircleWalletContext);
  if (!ctx) throw new Error("useCircleWalletContext must be used inside CircleWalletProvider");
  return ctx;
}

// ─── Session persistence (localStorage) ──────────────────────────────────────

const STORAGE_KEY = "arciq_circle_session";

function saveSession(s: StoredSession) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}
function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function clearSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ─── Lazy-loaded Circle Web SDK (browser only) ───────────────────────────────

let sdkPromise: Promise<any> | null = null;
async function getSdk(appId: string) {
  assertAppId(appId);
  if (!sdkPromise) {
    sdkPromise = import("@circle-fin/w3s-pw-web-sdk").then(({ W3SSdk }) => {
      const sdk = new W3SSdk();
      sdk.setAppSettings({ appId });
      return sdk;
    });
  }
  return sdkPromise;
}

/** Always constructs a brand-new SDK instance rather than reusing the shared
 *  singleton. Used for post-login challenges (wallet setup, transactions) —
 *  reusing the same instance that just ran the login/OTP flow may carry
 *  stale internal state that prevents it from opening a new challenge UI. */
async function getFreshSdk(appId: string) {
  assertAppId(appId);
  const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
  const sdk = new W3SSdk();
  sdk.setAppSettings({ appId });
  return sdk;
}

/** With an empty/missing appId, W3SSdk fails to construct its challenge
 *  iframe but does NOT throw or invoke the execute() callback — it just does
 *  nothing, which looked like "no PIN prompt ever appears" with no error
 *  anywhere. Fail loudly here instead of silently later. */
function assertAppId(appId: string) {
  if (!appId) {
    throw new Error(
      "NEXT_PUBLIC_CIRCLE_APP_ID is missing on the client — the Circle challenge UI can't render without it. Check it's set in .env.local and that you restarted the dev server / rebuilt after adding it."
    );
  }
}

/** W3SSdk is a hard singleton internally (see its constructor: if an
 *  instance already exists, `new W3SSdk()` just returns THAT instance and
 *  reuses its ONE iframe DOM element forever — our getFreshSdk() below does
 *  NOT actually get a fresh instance, the SDK ignores that entirely). The
 *  SDK only removes/resets that iframe when a challenge finishes cleanly
 *  (its internal onComplete/onClose message handlers). If a previous
 *  challenge ever timed out, errored, or was abandoned instead of finishing
 *  cleanly — which happened repeatedly while debugging this — the iframe is
 *  left attached in a stale state, and the next execute() call reuses that
 *  same stuck iframe without forcing it to reload, so nothing visible
 *  happens even though execute() itself doesn't error. This is almost
 *  certainly why the prompt "worked once, then stopped." We can't reset the
 *  SDK's internal singleton from outside, but we CAN force-remove its iframe
 *  (it always uses the fixed id "sdkIframe") right before every challenge,
 *  so appendIframe() is always re-attaching a genuinely detached node —
 *  which reliably forces a real reload — instead of possibly reusing an
 *  already-attached, stale one. */
function resetStaleChallengeIframe() {
  if (typeof document === "undefined") return;
  const stale = document.getElementById("sdkIframe");
  if (stale?.parentNode) {
    stale.parentNode.removeChild(stale);
  }
}

/** Circle's execute() callback simply never fires if the challenge iframe
 *  fails to mount (wrong appId, an ad-blocker or CSP blocking Circle's
 *  domain, a popup blocker, etc.) — previously this meant the promise hung
 *  forever with the UI stuck on a spinner and no visible prompt or error.
 *  A hard timeout turns that silent hang into an actionable error. */
function executeChallenge(sdk: any, challengeId: string, timeoutMs = 180000): Promise<any> {
  return new Promise((resolve, reject) => {
    const hadStale = typeof document !== "undefined" && !!document.getElementById("sdkIframe");
    resetStaleChallengeIframe();
    console.log(`[circleWallet] executeChallenge starting — challengeId=${challengeId}, removedStaleIframe=${hadStale}`);

    // Ground-truth DOM check: don't guess whether the iframe actually
    // mounted — look. This runs a moment after calling sdk.execute() so the
    // SDK has had time to call appendIframe() internally.
    setTimeout(() => {
      if (typeof document === "undefined") return;
      const el = document.getElementById("sdkIframe") as HTMLIFrameElement | null;
      if (!el) {
        console.warn("[circleWallet] 800ms after execute(): #sdkIframe was NOT found in the DOM at all — Circle's SDK never even tried to mount it.");
        return;
      }
      const style = window.getComputedStyle(el);
      console.log("[circleWallet] 800ms after execute(): #sdkIframe found —", {
        src: el.src,
        inlineDisplay: el.style.display,
        computedDisplay: style.display,
        width: style.width,
        height: style.height,
        zIndex: style.zIndex,
        isVisible: el.offsetParent !== null,
      });
    }, 800);

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          `The Circle challenge prompt got no response after ${Math.round(timeoutMs / 1000)}s. If you saw the PIN prompt and it just needed more time, try again — if you never saw ANY prompt at all, that usually means an ad-blocker, browser extension, or content-security-policy is blocking Circle's challenge iframe; try disabling extensions or an incognito window and check the browser console/network tab for blocked requests to circle.com.`
        )
      );
    }, timeoutMs);

    sdk.execute(challengeId, (error: any, result: any) => {
      console.log("[circleWallet] sdk.execute() callback fired —", { error, result });
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(new Error(error?.message ?? "Wallet challenge failed"));
        return;
      }
      resolve(result);
    });
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CircleWalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CircleWalletState>({
    step: "restoring",
    email: null,
    address: null,
    walletId: null,
    isBusy: false,
    error: null,
    modalOpen: false,
    challengeActive: false,
  });

  // Full session, including refreshToken/deviceId — kept out of React state
  // since it never needs to trigger a re-render by itself.
  const sessionRef = useRef<{
    userToken: string;
    encryptionKey: string;
    refreshToken: string;
    deviceId: string;
  } | null>(null);

  const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID ?? "";

  const patch = (p: Partial<CircleWalletState>) => setState((s) => ({ ...s, ...p }));

  // ── Restore a stored session on first mount ──────────────────────────────
  useEffect(() => {
    (async () => {
      const stored = loadSession();
      if (!stored) {
        patch({ step: "signedOut" });
        return;
      }

      // Fast path: stored userToken might still be valid (< 60 min old).
      let session = {
        userToken: stored.userToken,
        encryptionKey: stored.encryptionKey,
        refreshToken: stored.refreshToken,
        deviceId: stored.deviceId,
      };

      let walletBody = await checkWallet(session.userToken);

      if (!walletBody.ok) {
        // Token's likely stale — exchange the refresh token for a new one.
        try {
          const refreshRes = await fetch("/api/circle/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userToken: session.userToken,
              refreshToken: session.refreshToken,
              deviceId: session.deviceId,
            }),
          });
          const refreshBody = await refreshRes.json();
          if (!refreshRes.ok) throw new Error(refreshBody.error);

          session = {
            userToken: refreshBody.userToken,
            encryptionKey: refreshBody.encryptionKey,
            refreshToken: refreshBody.refreshToken,
            deviceId: session.deviceId,
          };
          walletBody = await checkWallet(session.userToken);
        } catch {
          // Refresh failed too — session is genuinely gone, sign out quietly.
          clearSession();
          patch({ step: "signedOut" });
          return;
        }
      }

      if (!walletBody.ok || !walletBody.address) {
        clearSession();
        patch({ step: "signedOut" });
        return;
      }

      sessionRef.current = session;
      saveSession({
        ...session,
        address: walletBody.address,
        walletId: walletBody.walletId,
        email: stored.email,
      });

      try {
        const pinStatus = await checkPinStatus(session.userToken);
        if (pinStatus !== "ENABLED") {
          // Don't just park here — a returning user with no PIN has no other
          // way to trigger the challenge, so open the modal and run it now.
          patch({
            step: "needsPin",
            email: stored.email,
            address: walletBody.address,
            walletId: walletBody.walletId,
            modalOpen: true,
            isBusy: true,
          });
          try {
            await ensurePinSet(session.userToken, session.encryptionKey, appId, (active) =>
              patch({ challengeActive: active })
            );
            patch({ step: "ready", modalOpen: false, isBusy: false });
          } catch (e: any) {
            // Leave step as "needsPin" with the modal open, spinner off, and
            // an error shown so the user can retry via the button in
            // EmailAuthModal, instead of silently stalling.
            patch({ isBusy: false, error: e.message ?? "Could not finish PIN setup" });
          }
          return;
        }
      } catch {
        // If the check itself fails, fall through to ready rather than
        // blocking a returning user entirely — writeContract will surface
        // a clear error if signing genuinely isn't possible.
      }

      patch({
        step: "ready",
        email: stored.email,
        address: walletBody.address,
        walletId: walletBody.walletId,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = useCallback(() => patch({ modalOpen: true, error: null }), []);
  const closeModal = useCallback(() => patch({ modalOpen: false }), []);

  const loginWithEmail = useCallback(async (email: string) => {
    patch({ isBusy: true, error: null, email });
    try {
      const sdk = await getSdk(appId);
      const deviceId: string = await sdk.getDeviceId();

      const res = await fetch("/api/circle/email-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not start email login");

      patch({ step: "authenticating" });

      // sdk.verifyOtp() renders Circle's own hosted OTP-entry iframe on top
      // of the page. The result arrives via the login-complete callback below.
      const loginResult = await new Promise<{
        userToken: string;
        encryptionKey: string;
        refreshToken: string;
      }>((resolve, reject) => {
        sdk.updateConfigs(
          {
            appSettings: { appId },
            loginConfigs: {
              deviceToken: body.deviceToken,
              deviceEncryptionKey: body.deviceEncryptionKey,
              otpToken: body.otpToken,
            },
          },
          (error: any, result: any) => {
            if (error) {
              reject(new Error(error?.message ?? "Email verification failed"));
              return;
            }
            resolve({
              userToken: result.userToken,
              encryptionKey: result.encryptionKey,
              refreshToken: result.refreshToken,
            });
          }
        );
        sdk.verifyOtp();
      });

      sessionRef.current = { ...loginResult, deviceId };

      // Does this user already have a wallet?
      const walletRes = await fetch("/api/circle/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken: loginResult.userToken }),
      });
      const walletBody = await walletRes.json();

      if (walletRes.ok && walletBody.address) {
        saveSession({
          ...loginResult,
          deviceId,
          address: walletBody.address,
          walletId: walletBody.walletId,
          email,
        });

        const pinStatus = await checkPinStatus(loginResult.userToken);
        if (pinStatus !== "ENABLED") {
          // Wallet exists but was never actually given a working PIN — walk
          // through PIN setup now, since without it nothing can ever be signed.
          patch({ step: "needsPin", address: walletBody.address, walletId: walletBody.walletId });
          await ensurePinSet(loginResult.userToken, loginResult.encryptionKey, appId, (active) =>
            patch({ challengeActive: active })
          );
        }

        patch({
          step: "ready",
          address: walletBody.address,
          walletId: walletBody.walletId,
          isBusy: false,
          modalOpen: false,
        });
        return;
      }

      // No wallet yet — kick off the PIN-setup + wallet-creation challenge.
      patch({ step: "needsWallet" });

      const initRes = await fetch("/api/circle/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken: loginResult.userToken }),
      });
      const initBody = await initRes.json();
      if (!initRes.ok) throw new Error(initBody.error ?? "Could not start wallet setup");

      const freshSdk = await getFreshSdk(appId);
      freshSdk.setAuthentication(loginResult);
      console.log("[circleWallet] wallet-init: authentication set —", {
        appId,
        hasUserToken: !!loginResult.userToken,
        hasEncryptionKey: !!loginResult.encryptionKey,
        challengeId: initBody.challengeId,
      });
      // challengeActive tells EmailAuthModal to get out of the way (return
      // null) so Circle's own iframe is actually visible instead of sitting
      // behind our modal's opaque backdrop.
      patch({ challengeActive: true });
      let challengeResult: any;
      try {
        challengeResult = await executeChallenge(freshSdk, initBody.challengeId);
      } finally {
        patch({ challengeActive: false });
      }
      // Diagnostic: if the PIN screen never visibly appeared, this tells us
      // whether Circle considered the challenge complete anyway.
      console.log("[circleWallet] wallet-init challenge result:", challengeResult);

      // Wallet provisioning (esp. for SCA account types) can lag a moment
      // behind the challenge completing — poll instead of checking once.
      const finalWalletBody = await pollForWallet(loginResult.userToken);

      // Defensive check: the challenge above is *supposed* to set a real PIN
      // alongside the wallet, but given we've seen that silently not happen,
      // verify it actually landed rather than assuming.
      const pinStatus = await checkPinStatus(loginResult.userToken);
      if (pinStatus !== "ENABLED") {
        patch({ step: "needsPin", address: finalWalletBody.address, walletId: finalWalletBody.walletId });
        await ensurePinSet(loginResult.userToken, loginResult.encryptionKey, appId, (active) =>
          patch({ challengeActive: active })
        );
      }

      saveSession({
        ...loginResult,
        deviceId,
        address: finalWalletBody.address,
        walletId: finalWalletBody.walletId,
        email,
      });
      patch({
        step: "ready",
        address: finalWalletBody.address,
        walletId: finalWalletBody.walletId,
        isBusy: false,
        modalOpen: false,
      });
    } catch (e: any) {
      patch({ isBusy: false, error: e.message, step: "signedOut" });
      throw e;
    }
  }, [appId]);

  const setupPin = useCallback(async () => {
    if (!sessionRef.current) {
      patch({ error: "Session expired — please sign in again." });
      return;
    }
    patch({ isBusy: true, error: null });
    try {
      await ensurePinSet(sessionRef.current.userToken, sessionRef.current.encryptionKey, appId, (active) =>
        patch({ challengeActive: active })
      );
      patch({ step: "ready", isBusy: false, modalOpen: false });
    } catch (e: any) {
      patch({ isBusy: false, error: e.message ?? "Could not finish PIN setup" });
    }
  }, [appId]);

  const logout = useCallback(() => {
    sessionRef.current = null;
    clearSession();
    setState({
      step: "signedOut",
      email: null,
      address: null,
      walletId: null,
      isBusy: false,
      error: null,
      modalOpen: false,
      challengeActive: false,
    });
  }, []);

  const writeContract = useCallback(
    async ({ address, abi, functionName, args = [], value }: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
      value?: bigint;
    }) => {
      if (!sessionRef.current || !state.walletId) {
        throw new Error("Wallet not ready — connect first");
      }
      patch({ isBusy: true, error: null });
      try {
        const callData = encodeFunctionData({ abi, functionName, args });
        const { userToken } = sessionRef.current;

        const res = await fetch("/api/circle/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userToken,
            walletId: state.walletId,
            contractAddress: address,
            callData,
            value: value ? value.toString() : "0",
          }),
        });
        const body = await res.json();
        console.log("[circleWallet] /api/circle/execute response —", { status: res.status, ok: res.ok, body });
        if (!res.ok) throw new Error(body.error ?? "Could not create transaction");

        const sdk = await getFreshSdk(appId);
        sdk.setAuthentication(sessionRef.current);
        console.log("[circleWallet] writeContract: authentication set —", {
          appId,
          walletId: state.walletId,
          contractAddress: address,
          functionName,
          hasUserToken: !!sessionRef.current.userToken,
          hasEncryptionKey: !!sessionRef.current.encryptionKey,
          challengeId: body.challengeId,
        });
        patch({ challengeActive: true });
        try {
          await executeChallenge(sdk, body.challengeId);
        } finally {
          patch({ challengeActive: false });
        }

        const hash = await pollTransactionHash(userToken, body.challengeId);
        patch({ isBusy: false });
        return hash;
      } catch (e: any) {
        patch({ isBusy: false, error: e.message });
        throw e;
      }
    },
    [appId, state.walletId]
  );

  const value = useMemo<CircleWalletContextValue>(
    () => ({ ...state, openModal, closeModal, loginWithEmail, setupPin, logout, writeContract }),
    [state, openModal, closeModal, loginWithEmail, setupPin, logout, writeContract]
  );

  return <CircleWalletContext.Provider value={value}>{children}</CircleWalletContext.Provider>;
}

async function checkPinStatus(userToken: string): Promise<string> {
  const res = await fetch("/api/circle/pin-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userToken }),
  });
  const body = await res.json();
  return res.ok ? body.pinStatus : "UNSET";
}

/** If this account's PIN was never actually set (possible even when a wallet
 *  address already exists — see notes on the pin-status route), this walks
 *  the user through Circle's PIN-setup challenge now. Without a real PIN,
 *  there's no valid signing key, so every transaction attempt would otherwise
 *  "confirm" in the UI but never actually reach the chain.
 *
 *  onActiveChange lets callers (which hold the actual React state/patch)
 *  toggle challengeActive around the executeChallenge call, so EmailAuthModal
 *  knows to get out of the way while Circle's iframe is up. */
async function ensurePinSet(
  userToken: string,
  encryptionKey: string,
  appId: string,
  onActiveChange?: (active: boolean) => void
) {
  const pinStatus = await checkPinStatus(userToken);
  if (pinStatus === "ENABLED") return;

  const res = await fetch("/api/circle/create-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userToken }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Could not start PIN setup");

  const sdk = await getFreshSdk(appId);
  sdk.setAuthentication({ userToken, encryptionKey });
  onActiveChange?.(true);
  try {
    await executeChallenge(sdk, body.challengeId);
  } finally {
    onActiveChange?.(false);
  }
}

async function checkWallet(userToken: string): Promise<{ ok: boolean; address?: `0x${string}`; walletId?: string }> {
  try {
    const res = await fetch("/api/circle/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userToken }),
    });
    const body = await res.json();
    if (!res.ok || !body.address) return { ok: false };
    return { ok: true, address: body.address, walletId: body.walletId };
  } catch {
    return { ok: false };
  }
}

async function pollForWallet(userToken: string): Promise<{ address: `0x${string}`; walletId: string }> {
  let lastError = "Wallet setup did not complete";
  for (let i = 0; i < 20; i++) {
    const res = await fetch("/api/circle/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userToken }),
    });
    const body = await res.json();
    if (res.ok && body.address) return { address: body.address, walletId: body.walletId };
    lastError = body.error ?? lastError;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(lastError);
}

/** Looks up the outcome of a transaction by challengeId — NOT by refId.
 *  Live testing proved refId is never persisted on the resulting Transaction
 *  for this wallet-challenge flow (every transaction came back with
 *  refId: null, regardless of what we sent), so the old list+refId-match
 *  approach could never succeed. challengeId is something we generate and
 *  already know with certainty, so this walks: challenge status ->
 *  correlationIds (the real transaction id) -> that transaction's actual
 *  state/txHash. See /api/circle/transaction for the lookup itself.
 *
 *  Confirmation timing varies a lot for user-controlled SCA wallets on
 *  testnet — Circle's own SDK ships a dedicated error code for a wallet's
 *  FIRST-EVER transaction needing to deploy its own smart contract on-chain
 *  first, which can take longer than a normal transaction. We poll for up
 *  to ~12 minutes, backing off to a slower interval after the first couple
 *  of minutes, and ONLY throw for a state Circle itself reports as
 *  terminal-failure. Anything else — including our own request hiccuping —
 *  is treated as "still pending", never "failed". */
async function pollTransactionHash(userToken: string, challengeId: string): Promise<`0x${string}`> {
  const start = Date.now();
  const maxDurationMs = 12 * 60 * 1000; // ~12 minutes total
  const fastIntervalMs = 3000; // for the first 2 minutes
  const fastPhaseMs = 2 * 60 * 1000;
  const slowIntervalMs = 8000; // afterward — likely a slow first-time SCA deploy

  while (Date.now() - start < maxDurationMs) {
    try {
      const res = await fetch("/api/circle/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken, challengeId }),
      });
      const body = await res.json();
      if (!res.ok) {
        console.warn(`[circleWallet] transaction status check failed (${res.status}):`, body?.error ?? body);
      }
      if ((body.state === "CONFIRMED" || body.state === "COMPLETE") && body.txHash) {
        return body.txHash as `0x${string}`;
      }
      if (body.state === "FAILED" || body.state === "DENIED" || body.state === "CANCELLED") {
        throw new Error(`Transaction ${(body.state as string).toLowerCase()}${body.error ? `: ${body.error}` : ""}`);
      }
      if (body.state === "STUCK") {
        throw new Error("Transaction is stuck on-chain — this usually means insufficient gas balance. Check your wallet's USDC balance covers both the amount and network fees.");
      }
      // Any other state (PENDING, IN_PROGRESS, QUEUED, SENT, etc.) — keep polling.
    } catch (e: any) {
      // A definite terminal state above always throws a plain Error with one
      // of the messages we just set — rethrow those immediately. A network
      // hiccup on the status check itself throws something else (e.g. a
      // fetch/JSON error) — don't treat that as the transaction failing,
      // just retry on the next tick.
      if (
        e instanceof Error &&
        (e.message.startsWith("Transaction ") || e.message.startsWith("Transaction is stuck"))
      ) {
        throw e;
      }
    }
    const elapsed = Date.now() - start;
    await new Promise((r) => setTimeout(r, elapsed < fastPhaseMs ? fastIntervalMs : slowIntervalMs));
  }
  throw new Error(
    "Still no confirmation after 12 minutes. This is unusual, but it doesn't necessarily mean it failed — a wallet's first-ever transaction can be slow while it deploys on-chain. Check the transaction on the Circle console; if it shows Complete there, it went through fine."
  );
}

// ─── wagmi-compatible shim hooks ──────────────────────────────────────────────

export function useAccount() {
  const { address, step } = useCircleWalletContext();
  return { address: address ?? undefined, isConnected: step === "ready" };
}

export function useConnect() {
  const { openModal, isBusy, step } = useCircleWalletContext();
  return {
    connect: () => openModal(),
    isPending: isBusy && step !== "ready",
  };
}

export function useDisconnect() {
  const { logout } = useCircleWalletContext();
  return { disconnect: () => logout() };
}

export function useWriteContract() {
  const { writeContract, isBusy } = useCircleWalletContext();
  return {
    writeContractAsync: writeContract,
    isPending: isBusy,
  };
}

/** Always reports the connected chain as Arc Testnet — Circle wallets are created
 *  directly on ARC-TESTNET, so there's no "wrong network" state to guard against. */
export function useChainId() {
  return ARC_TESTNET.id;
}
