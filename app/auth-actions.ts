"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/**
 * Server action invoked by the WalletConnect client component after it has
 * the SIWE message + signature ready. Auth.js handles the rest (verify in
 * the Credentials provider, mint a JWT, set the session cookie).
 */
export async function signInWithSiwe(message: string, signature: string) {
  await signIn("siwe", {
    message,
    signature,
    redirectTo: "/",
  });
}
