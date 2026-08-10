import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circleServer";

// For a user who already has a wallet but never actually set a PIN (see
// pin-status route). This is the "PIN only" challenge, distinct from
// createUserPinWithWallets which creates a wallet + PIN together for brand
// new users.
export async function POST(req: Request) {
  try {
    const { userToken } = await req.json();
    if (!userToken) return NextResponse.json({ error: "userToken required" }, { status: 400 });

    const res = await circleClient.createUserPin({ userToken });
    return NextResponse.json({ challengeId: res.data!.challengeId });
  } catch (e: any) {
    console.error("[api/circle/create-pin]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.response?.data?.message ?? "Failed to start PIN setup" },
      { status: 500 }
    );
  }
}
