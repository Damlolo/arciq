import { NextResponse } from "next/server";
import { circleClient, ARC_TESTNET_BLOCKCHAIN } from "@/lib/circleServer";

export async function POST(req: Request) {
  try {
    const { userToken } = await req.json();
    if (!userToken) return NextResponse.json({ error: "userToken required" }, { status: 400 });

    const res = await circleClient.listWallets({
      userToken,
      blockchain: ARC_TESTNET_BLOCKCHAIN,
    });
    const wallet = res.data?.wallets?.[0];
    if (!wallet) {
      return NextResponse.json({ error: "No wallet found yet" }, { status: 404 });
    }

    return NextResponse.json({ address: wallet.address, walletId: wallet.id });
  } catch (e: any) {
    console.error("[api/circle/wallet]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.response?.data?.message ?? "Failed to load wallet" },
      { status: 500 }
    );
  }
}
