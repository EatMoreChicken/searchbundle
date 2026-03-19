import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const isPublic =
        pathname === "/sign-in" ||
        pathname === "/sign-up" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/users");

      if (isPublic) return true;
      return !!auth?.user;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
