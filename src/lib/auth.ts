import type { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { db } from "@/lib/db";

const hasGithubOAuth = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET);

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "missing",
      clientSecret: process.env.GITHUB_SECRET ?? "missing",
      // Required: GitHub now sends `iss=https://github.com/login/oauth` (RFC 9207)
      // and openid-client rejects the callback when the provider has no issuer set.
      issuer: "https://github.com/login/oauth",
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        (token as any).accessToken = account.access_token;
      }
      if (profile) {
        (token as any).githubId = String((profile as any).id ?? "");
        (token as any).username =
          (profile as any).login ?? token.name ?? (token as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      (session as any).username = (token as any).username;
      (session as any).githubId = (token as any).githubId;
      return session;
    },
    async signIn({ user, account, profile }) {
      try {
        const username =
          (profile as any)?.login ?? user.name ?? user.email ?? `user-${Date.now()}`;
        const githubId = String((profile as any)?.id ?? username);
        await db.user.upsert({
          where: { githubId },
          update: {
            username,
            name: user.name ?? undefined,
            avatarUrl: user.image ?? undefined,
            accessToken: (account as any)?.access_token ?? undefined,
          },
          create: {
            githubId,
            username,
            name: user.name ?? null,
            avatarUrl: user.image ?? null,
            accessToken: (account as any)?.access_token ?? null,
            publishedSlug: username.toLowerCase(),
          },
        });
      } catch (e) {
        console.error("signIn DB upsert failed (continuing without DB):", e);
      }
      return true;
    },
  },
  pages: { signIn: "/" },
};

export { hasGithubOAuth };
