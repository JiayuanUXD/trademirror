import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const mustChangePassword = req.auth?.user?.mustChangePassword;

  // Public paths that don't need auth
  const publicPaths = ["/login", "/register"];
  if (publicPaths.includes(pathname)) {
    if (isLoggedIn) {
      // If must change password, let them go to change-password, not home
      if (mustChangePassword) {
        return NextResponse.redirect(new URL("/change-password", req.nextUrl));
      }
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  // All other paths require login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Force password change: redirect to /change-password unless already there
  if (mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", req.nextUrl));
  }

  // Admin routes
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
