import { NextResponse } from "next/server";
import { circleClient, ARC_TESTNET_BLOCKCHAIN } from "@/lib/circleServer";

export async function POST(req: Request) {
  try {
    const { userToken } = await req.json();
    if (!userToken) return NextResponse.json({ error: "userToken required" }, { status: 400 });

    const res = await circleClient.createUserPinWithWallets({
      userToken,
      accountType: "SCA", // smart contract account — gas sponsorship / batching friendly
      blockchains: [ARC_TESTNET_BLOCKCHAIN],
    });

    return NextResponse.json({ challengeId: res.data!.challengeId });
  } catch (e: any) {
    console.error("[api/circle/initialize]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.response?.data?.message ?? "Failed to start wallet setup" },
      { status: 500 }
    );
  }
}
