import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circleServer";

// userToken expires after 60 minutes — this exchanges a stored refreshToken
// for a fresh one so a returning visitor doesn't have to re-enter their email.
export async function POST(req: Request) {
  try {
    const { userToken, refreshToken, deviceId } = await req.json();
    if (!userToken || !refreshToken || !deviceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const res = await circleClient.refreshUserToken({ userToken, refreshToken, deviceId });

    return NextResponse.json({
      userToken: res.data!.userToken,
      encryptionKey: res.data!.encryptionKey,
      refreshToken: res.data!.refreshToken ?? refreshToken,
    });
  } catch (e: any) {
    console.error("[api/circle/refresh-token]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.response?.data?.message ?? "Failed to refresh session" },
      { status: 500 }
    );
  }
}
