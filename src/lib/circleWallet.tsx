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
import {
  useAccount as useWagmiAccount,
  useConnect as useWagmiConnect,
  useDisconnect as useWagmiDisconnect,
  useWriteContract as useWagmiWriteContract,
} from "wagmi";
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
  /** Starts Circle's native Google social login. This navigates the whole
   *  page away to Google's OAuth screen and back — unlike email OTP, which
   *  stays on-page in an iframe. */
  loginWithGoogle: () => Promise<void>;
  /** Connects an external wallet (MetaMask, Rabby, OKX, Zerion, WalletConnect,
   *  ...) via wagmi — a path that bypasses Circle entirely. Once connected,
   *  address/isConnected/writeContract everywhere else in the app
   *  transparently reflect this wallet instead of a Circle one. */
  connectExternalWallet: (connector: any) => Promise<void>;
  /** True when an external (non-Circle) wallet is the active connection. */
  isExternalWallet: boolean;
  /** Re-runs the PIN-setup challenge for a wallet that exists but has no
   *  working PIN yet. Exposed so the UI can offer a retry when step is
   *  "needsPin" — this state can otherwise be a dead end (e.g. after a
   *  reload, or if the challenge iframe was closed/interrupted last time). */
  setupPin: () => Promise<void>;
  logout: (opts?: { reason?: string }) => void;
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

const STORAGE_KEY = "lendiq_circle_session";

// Bridges Google's full-page OAuth redirect: written right before
// performLogin() navigates away, read back by the redirect-resume effect
// once the browser returns to the app.
export const GOOGLE_PENDING_KEY = "lendiq_google_pending_login";

// ─── Idle auto-logout timing ──────────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of no interaction
const IDLE_CHECK_INTERVAL_MS = 30 * 1000; // how often to check for idleness

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

// Persisted (not just in-memory) last-activity timestamp. This is what makes
// the idle timeout actually work across page loads — an in-memory-only ref
// resets to "just active" on every fresh mount, including simply reopening
// the browser after being away for hours, which defeats the whole point.
// Checked against wall-clock time during session restore, before a stored
// session is ever trusted.
const LAST_ACTIVITY_KEY = "lendiq_last_activity";
function markActivityPersisted() {
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch {}
}
function getPersistedLastActivity(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}
function clearPersistedActivity() {
  try { localStorage.removeItem(LAST_ACTIVITY_KEY); } catch {}
}

/** SocialLoginProvider is exported from a subpath, not the package root —
 *  imported dynamically (like the SDK itself) rather than guessing the
 *  underlying string value, since it's an internal enum whose exact runtime
 *  value isn't documented. */
async function getSocialLoginProvider(name: "google") {
  const mod: any = await import("@circle-fin/w3s-pw-web-sdk/dist/src/types");
  return mod.SocialLoginProvider[name.toUpperCase() as "GOOGLE"];
}

// ─── Lazy-loaded Circle Web SDK (browser only) ───────────────────────────────

// W3SSdk is a hard singleton (see getFreshSdk's comment below) — only the
// FIRST-EVER `new W3SSdk(...)` call in a given page's lifetime actually takes
// effect; everything after it just returns that same instance, ignoring new
// constructor args. That means a login-complete callback can only reliably be
// wired in AT that first construction. Google's redirect flow needs one (see
// loginWithGoogle / the redirect-resume effect below) — email OTP does NOT
// rely on this slot at all (it uses its own per-call callback via
// updateConfigs() instead, which is a separate mechanism and unaffected by
// this). Routing every getSdk() caller through this same stable wrapper,
// regardless of which flow calls it first, means whichever construction wins
// still ends up with a working callback slot for Google's benefit, without
// changing anything about how email login behaves.
let socialLoginHandler: ((error: any, result: any) => void) | null = null;

let sdkPromise: Promise<any> | null = null;
async function getSdk(appId: string) {
  assertAppId(appId);
  if (!sdkPromise) {
    sdkPromise = import("@circle-fin/w3s-pw-web-sdk").then(({ W3SSdk }) => {
      // appSettings goes IN THE CONSTRUCTOR — every Circle doc/example does
      // it this way (`new W3SSdk({ appSettings: { appId } })`). Constructing
      // with no args and calling setAppSettings() afterward isn't a
      // documented pattern, and left the challenge iframe rendering as a
      // malformed, invisible 0x0 element (present in the DOM, but
      // display:none / 0% width/height) instead of the actual PIN UI.
      return new W3SSdk({ appSettings: { appId } }, (error: any, result: any) => {
        socialLoginHandler?.(error, result);
      });
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
  const sdk = new W3SSdk({ appSettings: { appId } });
  // REQUIRED per Circle's own docs: "you must call sdk.getDeviceId() after
  // SDK initialization... without this call, sdk.execute() will silently
  // fail." getSdk() (used once, for the initial email login) already does
  // this — but getFreshSdk() deliberately builds a SEPARATE instance for
  // every later challenge (to dodge the stale-iframe reuse problem), and
  // that separate instance never got its own getDeviceId() call. This is
  // almost certainly why challenges were resolving with no error and no
  // visible UI — the SDK had no established session to run a real challenge
  // against.
  await sdk.getDeviceId();
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
/** Plain fetch() has no built-in timeout — a stalled request (network blip,
 *  slow serverless cold start, etc) can leave it pending indefinitely. Every
 *  call in the sign-in / wallet-setup path is awaited in sequence, so ONE
 *  hung fetch previously meant the entire flow stalled forever with nothing
 *  but a spinner on screen and no way out short of a manual refresh — even
 *  though executeChallenge() below already has robust timeout handling of
 *  its own. This wraps fetch with an AbortController so any request to our
 *  own API routes surfaces a clear, catchable error within a bounded time
 *  instead, which the callers' existing try/catch blocks turn into a proper
 *  "signedOut" + error state rather than an infinite hang. */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("Request timed out — check your connection and try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function resetStaleChallengeIframe() {
  if (typeof document === "undefined") return;
  const stale = document.getElementById("sdkIframe");
  if (stale?.parentNode) {
    stale.parentNode.removeChild(stale);
  }
}

/** Root-cause-agnostic fix: regardless of WHY #sdkIframe ends up with
 *  display:none / 0% width+height / z-index:-1 (a wallet-extension content
 *  script, a CSP quirk, or Circle's own SDK never flipping it to visible),
 *  we own the DOM once the element exists, so force it into a visible,
 *  full-viewport, top-layer state ourselves rather than depending on
 *  whatever was supposed to do that.
 *
 *  Uses setProperty(..., "important") because plain style assignment can be
 *  losing to another script's `!important` rule or repeated overwrites —
 *  and a MutationObserver keeps re-asserting these in case something else
 *  (extension content script, Circle's own loading-state logic) flips them
 *  back after we set them. Cleans up the observer once the iframe is
 *  removed from the DOM (challenge finished/cancelled). */
function forceIframeVisible(el: HTMLIFrameElement) {
  const apply = () => {
    // Escape any ancestor that clips overflow or creates its own stacking
    // context (transform/opacity/filter/will-change) — no z-index on this
    // element can beat a sibling stacking context from the outside, so the
    // reliable fix is to not be nested inside one at all.
    if (el.parentElement && el.parentElement !== document.body) {
      document.body.appendChild(el);
    }

    el.style.setProperty("display", "block", "important");
    el.style.setProperty("visibility", "visible", "important");
    el.style.setProperty("opacity", "1", "important");
    el.style.setProperty("position", "fixed", "important");
    el.style.setProperty("top", "50%", "important");
    el.style.setProperty("left", "50%", "important");
    // Re-apply the SAME centering pair Circle's own CSS almost certainly
    // intends (top/left:50% + translate(-50%,-50%)) as one consistent set,
    // instead of a mismatched partial override — confirmed via rectX/rectY
    // exactly matching -width/2, -height/2 that pinning top/left to 0 while
    // a leftover translate(-50%,-50%) was still active pushed the box
    // off-screen by half its own size.
    el.style.setProperty("transform", "translate(-50%, -50%)", "important");
    el.style.setProperty("max-width", "100vw", "important");
    el.style.setProperty("max-height", "100vh", "important");
    el.style.setProperty("z-index", "2147483647", "important");
    el.style.setProperty("pointer-events", "auto", "important");
    // Some SDKs size iframes via the width/height HTML attributes (not
    // CSS), which can win over percentage/vw-vh CSS values in some browser
    // rendering paths — clear those too so our CSS is the only sizing input.
    el.removeAttribute("width");
    el.removeAttribute("height");

    const rect = el.getBoundingClientRect();
    console.log("[circleWallet] forceIframeVisible applied — actual on-screen rect:", {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      parent: el.parentElement?.tagName,
    });
  };

  apply();

  const observer = new MutationObserver(() => {
    if (!document.body.contains(el)) {
      observer.disconnect();
      return;
    }
    const style = window.getComputedStyle(el);
    const hidden =
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.width === "0px" ||
      style.height === "0px" ||
      Number(style.zIndex || "0") < 0;
    if (hidden) {
      console.warn("[circleWallet] #sdkIframe was hidden again after mount — re-forcing visible.");
      apply();
    }
  });
  observer.observe(el, { attributes: true, attributeFilter: ["style", "class"] });

  // Safety net: stop watching after 3 minutes regardless (challenge timeout
  // window), so we never leave a dangling observer running forever.
  setTimeout(() => observer.disconnect(), 180000);

  return () => observer.disconnect();
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
      const rect = el.getBoundingClientRect();
      // offsetParent is unreliable here — it's always null for
      // position:fixed elements regardless of actual visibility. Use the
      // real rendered box instead.
      const actuallyVisible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0;
      console.log("[circleWallet] 800ms after execute(): #sdkIframe found —", {
        src: el.src,
        inlineDisplay: el.style.display,
        computedDisplay: style.display,
        rectWidth: rect.width,
        rectHeight: rect.height,
        rectX: rect.x,
        rectY: rect.y,
        zIndex: style.zIndex,
        isVisible: actuallyVisible,
      });
      if (!actuallyVisible) {
        console.warn("[circleWallet] #sdkIframe is invisible — forcing it visible.");
      }
      forceIframeVisible(el);
    }, 800);

    // Don't wait 800ms to start forcing visibility — do it the instant the
    // element exists at all, so the window where it's invisible is as short
    // as possible. The 800ms check above just re-confirms/re-applies.
    const earlyCheck = setInterval(() => {
      if (typeof document === "undefined") return;
      const el = document.getElementById("sdkIframe") as HTMLIFrameElement | null;
      if (el) {
        forceIframeVisible(el);
        clearInterval(earlyCheck);
      }
    }, 100);
    setTimeout(() => clearInterval(earlyCheck), 5000);

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

      if (error) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(error?.message ?? "Wallet challenge failed"));
        return;
      }

      // Circle's own documented enum (ChallengeStatus: COMPLETE, EXPIRED,
      // FAILED, IN_PROGRESS, PENDING) makes IN_PROGRESS explicitly
      // non-terminal — it means Circle is still waiting on the user, not
      // that the challenge is done. The previous version of this code
      // resolved on ANY first callback including IN_PROGRESS, based on
      // testing that concluded "no second callback ever comes" — but that
      // testing happened while the challenge iframe had a separate
      // rendering bug (invisible/off-screen), so the user could never
      // actually interact with it in the first place. That made "no second
      // callback" a foregone conclusion regardless of whether the SDK
      // supports one, not real evidence about the SDK's behavior. Now that
      // the iframe actually renders, only treat genuinely terminal statuses
      // as done, and reject clearly on failure/expiry instead of silently
      // treating them as success.
      const status = result?.status;
      if (status === "COMPLETE") {
        settled = true;
        clearTimeout(timer);
        resolve(result);
        return;
      }
      if (status === "FAILED" || status === "EXPIRED") {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Challenge ${status.toLowerCase()} — please try again.`));
        return;
      }

      // IN_PROGRESS / PENDING: genuinely not done. Log and keep waiting —
      // either a later callback with a terminal status arrives, or the
      // existing timeout above fires with an actionable error instead of
      // us silently pretending an unfinished challenge succeeded.
      console.log(`[circleWallet] challenge status is "${status}" — not terminal, continuing to wait.`);
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

  // ── External wallet (bypasses Circle entirely) ────────────────────────────
  // "Connect wallet" — MetaMask/Rabby/OKX/Zerion/WalletConnect — is a wagmi
  // connection, not a Circle one. Whenever one is connected, it takes
  // priority over any Circle session everywhere below: address/isConnected,
  // logout, the idle timer, and writeContract all check this first.
  const wagmiAccount = useWagmiAccount();
  const { connectAsync: wagmiConnectAsync } = useWagmiConnect();
  const { disconnectAsync: wagmiDisconnectAsync } = useWagmiDisconnect();
  const { writeContractAsync: wagmiWriteContractAsync } = useWagmiWriteContract();
  const isExternalWallet = wagmiAccount.isConnected && !!wagmiAccount.address;

  const connectExternalWallet = useCallback(
    async (connector: any) => {
      patch({ error: null });
      try {
        await wagmiConnectAsync({ connector });
        patch({ modalOpen: false });
      } catch (e: any) {
        patch({ error: e?.message ?? "Could not connect that wallet" });
      }
    },
    [wagmiConnectAsync]
  );

  const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID ?? "";
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  const patch = (p: Partial<CircleWalletState>) => setState((s) => ({ ...s, ...p }));

  // ── Restore a stored session on first mount ──────────────────────────────
  useEffect(() => {
    (async () => {
      const stored = loadSession();
      if (!stored) {
        patch({ step: "signedOut" });
        return;
      }

      // Check REAL elapsed wall-clock time since the user was last active —
      // not just "is there a session in localStorage". A session sitting
      // untouched since yesterday should not silently restore just because
      // the tab was reopened; that's the exact case the idle timeout is
      // supposed to catch, and an in-memory-only timer can't catch it since
      // memory is wiped every time the page reloads.
      const lastActivity = getPersistedLastActivity();
      if (lastActivity !== null && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        clearSession();
        clearPersistedActivity();
        patch({ step: "signedOut", error: "You were signed out after 15 minutes of inactivity. Please sign in again." });
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
          const refreshRes = await fetchWithTimeout("/api/circle/refresh-token", {
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

      const res = await fetchWithTimeout("/api/circle/email-login", {
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
      const walletRes = await fetchWithTimeout("/api/circle/wallet", {
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

      const initRes = await fetchWithTimeout("/api/circle/initialize", {
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

      // NOTE: intentionally NOT re-checking/re-challenging PIN status here.
      // createUserPinWithWallets() above already bundles PIN setup into the
      // SAME challenge as wallet creation — Circle's SDK requires a PIN to
      // create a non-custodial wallet at all, so if pollForWallet just
      // succeeded, the PIN was necessarily set as part of that. A second,
      // separate PIN challenge after this point was pure defensive
      // paranoia and gave every sign-in two chances to hit a stuck
      // challenge instead of one.

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

  // ── Shared tail logic for "we just got a userToken/encryptionKey back from
  //    Circle" — used by both loginWithEmail (above) and the Google
  //    redirect-resume flow (below). Checks for an existing wallet, sets one
  //    up if needed, verifies a PIN is actually set, and lands on "ready".
  const finishSocialLogin = useCallback(
    async (
      loginResult: { userToken: string; encryptionKey: string; refreshToken: string },
      deviceId: string,
      email: string | null
    ) => {
      sessionRef.current = { ...loginResult, deviceId };

      const walletRes = await fetchWithTimeout("/api/circle/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken: loginResult.userToken }),
      });
      const walletBody = await walletRes.json();

      if (walletRes.ok && walletBody.address) {
        saveSession({ ...loginResult, deviceId, address: walletBody.address, walletId: walletBody.walletId, email });

        const pinStatus = await checkPinStatus(loginResult.userToken);
        if (pinStatus !== "ENABLED") {
          patch({ step: "needsPin", address: walletBody.address, walletId: walletBody.walletId });
          await ensurePinSet(loginResult.userToken, loginResult.encryptionKey, appId, (active) =>
            patch({ challengeActive: active })
          );
        }

        patch({ step: "ready", address: walletBody.address, walletId: walletBody.walletId, isBusy: false, modalOpen: false, email });
        return;
      }

      // No wallet yet — kick off the PIN-setup + wallet-creation challenge.
      patch({ step: "needsWallet" });

      const initRes = await fetchWithTimeout("/api/circle/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken: loginResult.userToken }),
      });
      const initBody = await initRes.json();
      if (!initRes.ok) throw new Error(initBody.error ?? "Could not start wallet setup");

      const freshSdk = await getFreshSdk(appId);
      freshSdk.setAuthentication(loginResult);
      patch({ challengeActive: true });
      let challengeResult: any;
      try {
        challengeResult = await executeChallenge(freshSdk, initBody.challengeId);
      } finally {
        patch({ challengeActive: false });
      }
      console.log("[circleWallet] google wallet-init challenge result:", challengeResult);

      const finalWalletBody = await pollForWallet(loginResult.userToken);

      // See loginWithEmail's matching comment above — no second PIN
      // challenge here; createUserPinWithWallets already required one to
      // get this far.

      saveSession({ ...loginResult, deviceId, address: finalWalletBody.address, walletId: finalWalletBody.walletId, email });
      patch({ step: "ready", address: finalWalletBody.address, walletId: finalWalletBody.walletId, isBusy: false, modalOpen: false, email });
    },
    [appId]
  );

  // ── Google social login ───────────────────────────────────────────────────
  // Unlike email OTP (which stays on-page in an iframe), performLogin()
  // navigates the ENTIRE page away to Google's OAuth screen and back — so
  // nothing in this function's closure survives to see the result. Instead:
  //  1. Before redirecting, persist the deviceToken/deviceEncryptionKey this
  //     login attempt needs to localStorage (GOOGLE_PENDING_KEY).
  //  2. A separate effect (below, runs on every mount) checks for that
  //     pending marker and, if present, re-registers the SDK config +
  //     socialLoginHandler so the login-complete callback wired into getSdk()
  //     actually has something to call once Circle/Google resolve it.
  const loginWithGoogle = useCallback(async () => {
    if (!googleClientId) {
      patch({ error: "Google sign-in isn't configured yet — NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing." });
      return;
    }
    patch({ isBusy: true, error: null });
    try {
      const sdk = await getSdk(appId);
      const deviceId: string = await sdk.getDeviceId();

      const res = await fetchWithTimeout("/api/circle/social-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not start Google sign-in");

      localStorage.setItem(
        GOOGLE_PENDING_KEY,
        JSON.stringify({ deviceToken: body.deviceToken, deviceEncryptionKey: body.deviceEncryptionKey })
      );

      sdk.updateConfigs({
        appSettings: { appId },
        loginConfigs: {
          deviceToken: body.deviceToken,
          deviceEncryptionKey: body.deviceEncryptionKey,
          google: {
            clientId: googleClientId,
            redirectUri: window.location.origin,
            selectAccountPrompt: true,
          },
        },
      });

      patch({ step: "authenticating" });
      sdk.performLogin(await getSocialLoginProvider("google"));
      // Page navigates away here — nothing after this line runs.
    } catch (e: any) {
      localStorage.removeItem(GOOGLE_PENDING_KEY);
      patch({ isBusy: false, error: e.message ?? "Google sign-in failed", step: "signedOut" });
    }
  }, [appId, googleClientId]);

  // Resume a Google login after the OAuth redirect brings the browser back.
  // This is a genuinely fresh page load (full navigation, not a client-side
  // route change) — sdkPromise is null again, so this IS the first-ever
  // getSdk() construction for this page load whenever it applies, meaning
  // the login-complete callback wired into getSdk() is guaranteed to be the
  // one that fires here (see the singleton note above getSdk()).
  useEffect(() => {
    const pendingRaw = localStorage.getItem(GOOGLE_PENDING_KEY);
    if (!pendingRaw || !googleClientId) return;

    let pending: { deviceToken: string; deviceEncryptionKey: string };
    try {
      pending = JSON.parse(pendingRaw);
    } catch {
      localStorage.removeItem(GOOGLE_PENDING_KEY);
      return;
    }

    socialLoginHandler = async (error: any, result: any) => {
      localStorage.removeItem(GOOGLE_PENDING_KEY);
      socialLoginHandler = null;
      if (error) {
        patch({ isBusy: false, error: error.message ?? "Google sign-in failed", step: "signedOut" });
        return;
      }
      try {
        const sdk = await getSdk(appId);
        const deviceId: string = await sdk.getDeviceId();
        const email: string | null = result?.oAuthInfo?.socialUserInfo?.email ?? null;
        await finishSocialLogin(
          { userToken: result.userToken, encryptionKey: result.encryptionKey, refreshToken: result.refreshToken },
          deviceId,
          email
        );
      } catch (e: any) {
        patch({ isBusy: false, error: e.message ?? "Could not finish Google sign-in", step: "signedOut" });
      }
    };

    (async () => {
      patch({ step: "authenticating", modalOpen: true });
      const sdk = await getSdk(appId);
      sdk.updateConfigs({
        appSettings: { appId },
        loginConfigs: {
          deviceToken: pending.deviceToken,
          deviceEncryptionKey: pending.deviceEncryptionKey,
          google: {
            clientId: googleClientId,
            redirectUri: window.location.origin,
            selectAccountPrompt: true,
          },
        },
      });
      // No further call needed here — the SDK detects the completed OAuth
      // redirect itself (via the URL) and fires the constructor's
      // login-complete callback, which socialLoginHandler above is now
      // registered to receive.
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, googleClientId]);

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

  const logout = useCallback((opts?: { reason?: string }) => {
    if (isExternalWallet) {
      wagmiDisconnectAsync().catch(() => {});
    }
    sessionRef.current = null;
    clearSession();
    clearPersistedActivity();
    setState({
      step: "signedOut",
      email: null,
      address: null,
      walletId: null,
      isBusy: false,
      error: opts?.reason ?? null,
      modalOpen: !!opts?.reason,
      challengeActive: false,
    });
  }, [isExternalWallet, wagmiDisconnectAsync]);

  // ── Idle auto-logout ──────────────────────────────────────────────────────
  // Signs the user out after IDLE_TIMEOUT_MS of no interaction (mouse,
  // keyboard, touch, scroll). Uses a timestamp + polling interval, rather
  // than a single setTimeout, so background/throttled tabs still catch up
  // and log out once they're checked again instead of silently never firing.
  //
  // The timestamp is ALSO persisted to localStorage (not just kept in this
  // ref), because an in-memory-only timer resets to "just active" on every
  // fresh page load — including simply reopening the browser after being
  // away for hours. The restore-on-mount effect above checks this persisted
  // value before ever trusting a stored session.
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const isSignedIn = (state.step !== "signedOut" && state.step !== "restoring") || isExternalWallet;
    if (!isSignedIn) {
      clearPersistedActivity();
      return;
    }

    lastActivityRef.current = Date.now();
    markActivityPersisted();
    const markActive = () => { lastActivityRef.current = Date.now(); };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousedown",
      "mousemove",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
    ];
    activityEvents.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));

    const intervalId = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        logout({ reason: "You were signed out after 15 minutes of inactivity. Please sign in again." });
      } else {
        // Still active as of this tick — refresh the persisted timestamp so
        // a later reopened tab can judge elapsed time accurately.
        markActivityPersisted();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    // Persist right at the moment the tab is hidden/closed too, rather than
    // waiting for the next 30s tick — makes the "reopen after being away"
    // check as accurate as possible.
    const persistOnHide = () => {
      if (document.visibilityState === "hidden") markActivityPersisted();
    };
    document.addEventListener("visibilitychange", persistOnHide);
    window.addEventListener("pagehide", markActivityPersisted);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, markActive));
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", persistOnHide);
      window.removeEventListener("pagehide", markActivityPersisted);
    };
  }, [state.step, isExternalWallet, logout]);

  const writeContract = useCallback(
    async ({ address, abi, functionName, args = [], value }: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
      value?: bigint;
    }) => {
      // External wallet (MetaMask/Rabby/OKX/Zerion/WalletConnect) — the
      // wallet extension itself handles the confirmation UI and signing.
      // None of Circle's challenge/polling machinery applies here.
      if (isExternalWallet) {
        patch({ isBusy: true, error: null });
        try {
          const hash = await wagmiWriteContractAsync({
            address,
            abi,
            functionName,
            args,
            value,
            account: wagmiAccount.address as `0x${string}`,
            chain: ARC_TESTNET as any,
            chainId: ARC_TESTNET.id,
          });
          patch({ isBusy: false });
          return hash;
        } catch (e: any) {
          patch({ isBusy: false, error: e?.shortMessage ?? e?.message ?? "Transaction failed" });
          throw e;
        }
      }

      if (!sessionRef.current || !state.walletId) {
        throw new Error("Wallet not ready — connect first");
      }
      patch({ isBusy: true, error: null });
      try {
        const callData = encodeFunctionData({ abi, functionName, args });
        const { userToken } = sessionRef.current;

        const res = await fetchWithTimeout("/api/circle/execute", {
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
    [appId, state.walletId, isExternalWallet, wagmiAccount.address, wagmiWriteContractAsync]
  );

  const value = useMemo<CircleWalletContextValue>(
    () => ({
      ...state,
      // External wallet connection overrides Circle's own address/isConnected
      // (via isExternalWallet below in the exported shim hooks) — the raw
      // state.address here stays Circle-only, which is correct: it's what
      // "ready" etc. actually mean for the Circle-specific parts of the UI
      // (PIN setup, email step, etc.) regardless of which wallet is active.
      openModal,
      closeModal,
      loginWithEmail,
      loginWithGoogle,
      connectExternalWallet,
      isExternalWallet,
      setupPin,
      logout,
      writeContract,
    }),
    [state, openModal, closeModal, loginWithEmail, loginWithGoogle, connectExternalWallet, isExternalWallet, setupPin, logout, writeContract]
  );

  return <CircleWalletContext.Provider value={value}>{children}</CircleWalletContext.Provider>;
}

async function checkPinStatus(userToken: string): Promise<string> {
  const res = await fetchWithTimeout("/api/circle/pin-status", {
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

  const res = await fetchWithTimeout("/api/circle/create-pin", {
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
    const res = await fetchWithTimeout("/api/circle/wallet", {
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
    const res = await fetchWithTimeout("/api/circle/wallet", {
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
      const res = await fetchWithTimeout("/api/circle/transaction", {
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
  const { address, step, isExternalWallet } = useCircleWalletContext();
  const wagmiAccount = useWagmiAccount();
  if (isExternalWallet && wagmiAccount.address) {
    return { address: wagmiAccount.address, isConnected: true };
  }
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
