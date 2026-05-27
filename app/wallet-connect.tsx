"use client";

import { useState } from "react";
import { signInWithSiwe } from "./auth-actions";

type EthRequestArguments = {
  method: string;
  params?: unknown[];
};

type EthereumProvider = {
  request: (args: EthRequestArguments) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export default function WalletConnect() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("no EVM wallet found");
      }

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const rawAddress = accounts?.[0];
      if (!rawAddress) throw new Error("no account selected");

      const { getAddress } = await import("viem");
      const address = getAddress(rawAddress);

      const nonceRes = await fetch("/api/auth/siwe/nonce", {
        credentials: "include",
      });
      if (!nonceRes.ok) throw new Error("nonce fetch failed");
      const nonce = (await nonceRes.text()).trim();

      const { SiweMessage } = await import("siwe");
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement:
          "Sign in to Lodestar to access your personalized discovery feed.",
        uri: window.location.origin,
        version: "1",
        chainId: 8453,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = message.prepareMessage();

      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [prepared, address],
      })) as string;

      await signInWithSiwe(prepared, signature);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? (err as Error & { code?: number }).code === 4001
            ? "signature rejected"
            : err.message
          : "wallet connect failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={connect}
        disabled={busy}
        className="px-3 py-1.5 text-xs border border-accent text-accent hover:bg-accent hover:text-screen disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent transition-colors whitespace-nowrap"
        title="Sign in by signing a message with your EVM wallet"
      >
        {busy ? "signing…" : "$ login --wallet"}
      </button>
      {error && (
        <span className="text-[10px] text-err max-w-[200px] text-right">
          {error}
        </span>
      )}
    </div>
  );
}
