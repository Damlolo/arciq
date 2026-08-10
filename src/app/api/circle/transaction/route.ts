import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circleServer";

/** Previously this looked up the resulting transaction by searching
 *  listTransactions() for one whose refId matched what we'd sent when
 *  creating the challenge. Confirmed via live testing that this NEVER
 *  works: every transaction Circle returns for a user-controlled (PIN
 *  challenge) wallet has refId: null, regardless of what we send when
 *  creating the challenge — refId only appears to be persisted for other
 *  transaction-creation flows, not this one. That made every "did it
 *  confirm?" check search for a value that could never be found, which is
 *  the real reason transactions kept reporting as failed/pending on the
 *  frontend even when Circle's own console showed them Complete.
 *
 *  Fixed properly: we already know challengeId with total certainty (we
 *  just created it) — no searching/matching needed. getUserChallenge()
 *  returns a `correlationIds` array which, for a CREATE_TRANSACTION-type
 *  challenge, contains the actual transaction id once resolved. From there
 *  getTransaction(id) gives us the real state/txHash directly. */
export async function POST(req: Request) {
  let userToken: string | undefined, challengeId: string | undefined;
  try {
    ({ userToken, challengeId } = await req.json());
    if (!userToken || !challengeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const challengeRes = await circleClient.getUserChallenge({ userToken, challengeId });
    const challenge = challengeRes.data?.challenge;

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.status === "FAILED") {
      return NextResponse.json({
        state: "FAILED",
        error: challenge.errorMessage ?? `Challenge failed (code ${challenge.errorCode ?? "unknown"})`,
      });
    }
    if (challenge.status === "EXPIRED") {
      return NextResponse.json({ state: "FAILED", error: "Challenge expired before it was completed" });
    }
    if (challenge.status === "PENDING" || challenge.status === "IN_PROGRESS") {
      return NextResponse.json({ state: "PENDING" });
    }

    // status === "COMPLETE" — the challenge resolved, so the real
    // transaction id should be in correlationIds.
    const transactionId = challenge.correlationIds?.[0];
    if (!transactionId) {
      console.warn(`[api/circle/transaction] challenge ${challengeId} is COMPLETE but has no correlationIds — cannot look up the resulting transaction.`);
      return NextResponse.json({ state: "PENDING" });
    }

    const txRes = await circleClient.getTransaction({ userToken, id: transactionId });
    const tx = txRes.data?.transaction;
    if (!tx) {
      return NextResponse.json({ state: "PENDING" });
    }

    return NextResponse.json({ state: tx.state, txHash: tx.txHash ?? null });
  } catch (e: any) {
    console.error(
      `[api/circle/transaction] FAILED for challengeId=${challengeId}:`,
      JSON.stringify(
        { circleApiError: e?.response?.data ?? null, status: e?.response?.status ?? null, message: e?.message ?? String(e) },
        null,
        2
      )
    );
    return NextResponse.json(
      { error: e?.response?.data?.message ?? e?.message ?? "Failed to check transaction" },
      { status: 500 }
    );
  }
}
