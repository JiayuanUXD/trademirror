import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const mustChangePassword = req.auth?.user?.mustChangePassword;

  // Share pages — always accessible, no redirect
  if (pathname.startsWith("/s/")) {
    return NextResponse.next();
  }

  // Auth pages (login/register) — redirect to home if already logged in
  const authPaths = ["/login", "/register"];
  if (authPaths.includes(pathname)) {
    if (isLoggedIn) {
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
    "/((?!api|_next/static|_next/image|data|favicon.ico).*)",
  ],
};
