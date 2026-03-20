import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublic =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/users");

  if (!session?.user && !isPublic) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (
    session?.mustResetPassword &&
    pathname !== "/reset-password" &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/users")
  ) {
    return NextResponse.redirect(new URL("/reset-password", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
