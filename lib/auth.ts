import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { SiweMessage } from "siwe";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

const SIWE_NONCE_COOKIE = "lodestar.siwe-nonce";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GitHub,
    Credentials({
      id: "siwe",
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        const message =
          typeof credentials?.message === "string" ? credentials.message : null;
        const signature =
          typeof credentials?.signature === "string"
            ? credentials.signature
            : null;
        if (!message || !signature) return null;

        // Pull the nonce we issued — never trust the message's nonce alone.
        const cookieStore = await cookies();
        const expectedNonce = cookieStore.get(SIWE_NONCE_COOKIE)?.value;
        if (!expectedNonce) {
          console.warn("SIWE: no nonce cookie present");
          return null;
        }

        let parsed: SiweMessage;
        try {
          parsed = new SiweMessage(message);
        } catch (err) {
          console.warn("SIWE: invalid message", err);
          return null;
        }

        const verification = await parsed
          .verify({ signature, nonce: expectedNonce })
          .catch((err) => {
            console.warn("SIWE verify error:", err);
            return null;
          });
        if (!verification || !verification.success) {
          console.warn("SIWE verify failed");
          return null;
        }

        // Consume the nonce so it can't be replayed.
        cookieStore.delete(SIWE_NONCE_COOKIE);

        const address = verification.data.address.toLowerCase();

        // Upsert the user keyed by walletAddress.
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.walletAddress, address))
          .limit(1);

        if (existing.length > 0) {
          const u = existing[0];
          return {
            id: u.id,
            name: u.name ?? shortAddress(address),
            email: u.email ?? null,
            image: u.image ?? null,
          };
        }

        const [created] = await db
          .insert(users)
          .values({
            walletAddress: address,
            name: shortAddress(address),
          })
          .returning();

        return {
          id: created.id,
          name: created.name ?? shortAddress(address),
          email: null,
          image: null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    // keep defaults; we'll render auth UI inline in the dashboard
  },
});

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
