import { generateNonce } from "siwe";
import { cookies } from "next/headers";

const COOKIE_NAME = "lodestar.siwe-nonce";

export async function GET() {
  const nonce = generateNonce();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return new Response(nonce, {
    headers: { "content-type": "text/plain" },
  });
}
