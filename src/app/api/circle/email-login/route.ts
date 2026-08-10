import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circleServer";

// Kicks off Circle's own native email-OTP login (no Supabase, no app-managed
// userId — Circle looks up/creates the underlying user by email itself).
// The browser SDK uses the returned device token to render its own OTP-entry
// screen and, on success, hands back a real userToken/encryptionKey session.
export async function POST(req: Request) {
  try {
    const { deviceId, email } = await req.json();
    if (!deviceId || !email) {
      return NextResponse.json({ error: "deviceId and email required" }, { status: 400 });
    }

    const res = await circleClient.createDeviceTokenForEmailLogin({ deviceId, email });

    return NextResponse.json({
      deviceToken: res.data!.deviceToken,
      deviceEncryptionKey: res.data!.deviceEncryptionKey,
      otpToken: res.data!.otpToken,
    });
  } catch (e: any) {
    console.error("[api/circle/email-login]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.response?.data?.message ?? "Failed to start email login" },
      { status: 500 }
    );
  }
}
