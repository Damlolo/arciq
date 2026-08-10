import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circleServer";

// Checks whether this user actually has a PIN set. A wallet ADDRESS can exist
// (visible, can receive funds) even when pinStatus is "UNSET" — that happens
// when the PIN-setup challenge UI never actually rendered/completed. Without
// a real PIN, there's no valid signing key, so every transaction attempt will
// fail silently (challenge appears to "confirm" but nothing reaches the chain).
export async function POST(req: Request) {
  try {
    const { userToken } = await req.json();
    if (!userToken) return NextResponse.json({ error: "userToken required" }, { status: 400 });

    const res = await circleClient.getUserStatus({ userToken });
    return NextResponse.json({ pinStatus: res.data!.pinStatus ?? "UNSET" });
  } catch (e: any) {
    console.error("[api/circle/pin-status]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.response?.data?.message ?? "Failed to check PIN status" },
      { status: 500 }
    );
  }
}
