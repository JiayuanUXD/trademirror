import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth configuration.
 *
 * This config contains NO database access and NO Node-only dependencies
 * (Drizzle adapter, libsql client, bcrypt). It is the config consumed by
 * `middleware.ts`, which runs in the Edge runtime where those modules
 * cannot be loaded.
 *
 * The full configuration (adapter + credentials provider) lives in `auth.ts`
 * and is used by Route Handlers / Server Actions running in the Node runtime.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  // Providers are added in `auth.ts`; none are needed for edge middleware.
  providers: [],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "user";
        // OAuth users don't need to change password
        token.passwordChangedAt =
          account?.provider === "credentials"
            ? (user.passwordChangedAt ?? null)
            : Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.passwordChangedAt == null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
