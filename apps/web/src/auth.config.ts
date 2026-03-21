import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.activeHouseholdId = (user as Record<string, unknown>).activeHouseholdId as string | undefined;
        token.mustResetPassword = (user as Record<string, unknown>).mustResetPassword as boolean | undefined;
      }
      if (trigger === "update" && session?.activeHouseholdId) {
        token.activeHouseholdId = session.activeHouseholdId;
      }
      if (trigger === "update" && session?.mustResetPassword === false) {
        token.mustResetPassword = false;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.activeHouseholdId = token.activeHouseholdId as string;
      session.mustResetPassword = token.mustResetPassword as boolean ?? false;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const isPublic =
        pathname === "/sign-in" ||
        pathname === "/sign-up" ||
        pathname === "/reset-password" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/users");

      if (isPublic) return true;
      return !!auth?.user;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
