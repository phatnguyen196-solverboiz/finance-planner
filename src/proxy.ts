import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));

  // Nếu đã có cookie phiên mà vào trang đăng nhập/đăng ký -> chuyển về Dashboard
  if (AUTH_ROUTES.has(pathname) && hasSessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Không redirect cứng trang "/" chỉ dựa vào cookie tại đây để tránh vòng lặp redirect
  // khi cookie hết hạn; việc xác thực thực sự được kiểm tra trong requirePageUser()/requireUser().
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register"],
};
