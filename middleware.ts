import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Jednoduchá ochrana heslem. Když APP_PASSWORD není nastavené, login je vypnutý.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const token = req.cookies.get("tak_session")?.value;
  if (token && token === process.env.APP_SESSION_TOKEN) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // chráníme vše KROMĚ loginu, login API, Telegram webhooku/digestu (vlastní
  // secret) a statických assetů
  matcher: [
    "/((?!login|api/login|api/telegram/webhook|api/telegram/digest|_next/static|_next/image|favicon.ico).*)",
  ],
};
