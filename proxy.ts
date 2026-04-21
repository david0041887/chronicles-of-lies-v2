// Next.js 16: Proxy (formerly middleware). Protects game + admin routes.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/home", "/world", "/era", "/battle", "/collection", "/deck", "/forge", "/gacha", "/profile", "/settings", "/welcome"];
const ADMIN_PREFIXES = ["/admin"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;

  const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const needsAdmin = ADMIN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if ((needsAuth || needsAdmin) && !session) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  if (needsAdmin && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/home", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // Skip Next internals, API auth, static assets
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
