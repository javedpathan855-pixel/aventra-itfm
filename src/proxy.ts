import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Route interception (composition boundary — Next 16 proxy convention).
//
// proxy answers one cheap question: "does this request carry any session
// evidence for a protected page?" It never answers "may this user do
// this" — membership, roles, and tenant scope are enforced server-side by
// the authorization context resolver on every protected operation.
// A forged-but-valueless cookie passes proxy and is rejected downstream.

/** Page routes that require a session. API routes enforce auth in-handler. */
const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/organization", "/invitations"] as const;

/** Routes that never require a session. */
const PUBLIC_PREFIXES = ["/auth", "/showcase", "/api/auth"] as const;

/** True for public pages, auth flows, assets, and framework internals. */
const isPublicPath = (pathname: string): boolean => {
  if (pathname === "/") return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  const lastSegment = pathname.split("/").pop() ?? "";
  if (lastSegment.includes(".")) return true;
  if (pathname.startsWith("/_next")) return true;
  return false;
};

/** True for protected pages (session evidence required). */
const isProtectedPage = (pathname: string): boolean =>
  !isPublicPath(pathname) &&
  PROTECTED_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const proxy = (request: NextRequest): NextResponse => {
  const { pathname } = request.nextUrl;
  if (!isProtectedPage(pathname)) {
    return NextResponse.next();
  }
  if (!getSessionCookie(request)) {
    // Preserve the full original destination (path + query) so token
    // links like /invitations/accept?token=… survive the login round-trip.
    // Existing search params are cleared first — otherwise they would leak
    // onto /auth as stray parameters. searchParams encodes the value.
    const url = request.nextUrl.clone();
    const destination = `${pathname}${request.nextUrl.search}`;
    url.pathname = "/auth";
    url.search = "";
    url.searchParams.set("callbackUrl", destination);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"],
};

export default proxy;
export { isPublicPath, isProtectedPage, PROTECTED_PAGE_PREFIXES, PUBLIC_PREFIXES };
