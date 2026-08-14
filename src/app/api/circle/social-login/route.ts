import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circleServer";

// Kicks off Circle's native social-login flow (Google). Unlike email login,
// this doesn't take an email/OTP token — the browser SDK's performLogin()
// redirects to Google's own OAuth screen, and Circle validates the OAuth
// result on the way back. All this route does is exchange our deviceId for
// the deviceToken/deviceEncryptionKey pair the SDK needs before it can start
// that redirect.
export async function POST(req: Request) {
  try {
    const { deviceId } = await req.json();
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    const res = await circleClient.createDeviceTokenForSocialLogin({ deviceId });

    return NextResponse.json({
      deviceToken: res.data!.deviceToken,
      deviceEncryptionKey: res.data!.deviceEncryptionKey,
    });
  } catch (e: any) {
    console.error("[api/circle/social-login]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.response?.data?.message ?? "Failed to start Google sign-in" },
      { status: 500 }
    );
  }
}
