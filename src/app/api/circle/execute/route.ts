import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circleServer";

export async function POST(req: Request) {
  try {
    const { userToken, walletId, contractAddress, callData, value } = await req.json();
    if (!userToken || !walletId || !contractAddress || !callData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const refId = crypto.randomUUID();

    const res = await circleClient.createUserTransactionContractExecutionChallenge({
      userToken,
      walletId,
      contractAddress,
      callData,
      amount: value && value !== "0" ? value : undefined,
      refId,
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    } as any);

    // Note: Circle's challenge-creation response only returns a challengeId —
    // the transaction record itself is created once the user completes the PIN
    // challenge. We hand refId back so /api/circle/transaction can look it up
    // afterward via listTransactions + refId match.
    return NextResponse.json({ challengeId: res.data!.challengeId, refId });
  } catch (e: any) {
    console.error("[api/circle/execute]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.response?.data?.message ?? "Failed to create transaction" },
      { status: 500 }
    );
  }
}
