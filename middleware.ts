import { NextRequest, NextResponse } from "next/server";

const LOCALE_COOKIE = "Z_LOCALE";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // If already on /es, no redirect needed
  if (pathname === "/es" || pathname.startsWith("/es/")) {
    return NextResponse.next();
  }

  // Check if user has a locale cookie preference
  const localeCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (localeCookie === "en") {
    return NextResponse.next();
  }
  if (localeCookie === "es") {
    const url = request.nextUrl.clone();
    url.pathname = `/es${pathname}`;
    return NextResponse.redirect(url);
  }

  // Detect language from Accept-Language header
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const isSpanish = acceptLanguage
    .split(",")
    .some((part) => {
      const lang = part.split(";")[0].trim().toLowerCase();
      return lang === "es" || lang.startsWith("es-");
    });

  if (isSpanish) {
    const url = request.nextUrl.clone();
    url.pathname = `/es${pathname}`;
    const response = NextResponse.redirect(url);
    response.cookies.set(LOCALE_COOKIE, "es", { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  // Default: English, set cookie to avoid re-checking
  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
