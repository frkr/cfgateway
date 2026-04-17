import { createCookie } from "react-router";

export const adminAuthCookie = createCookie("admin_token", {
  maxAge: 604_800, // one week
  httpOnly: true,
  path: "/",
  sameSite: "lax", // Protects against CSRF but allows the cookie to be sent with top-level navigations
});

export async function checkAdminAuth(request: Request, env: Env) {
	// First check the Authorization header as a fallback for API-like usage
	const authHeader = request.headers.get('Authorization');
	const headerToken = authHeader ? authHeader.replace('Bearer ', '') : null;
	
	if (headerToken && headerToken === env.ADMIN_TOKEN) {
		return true;
	}

	// Then check the HttpOnly cookie
	const cookieHeader = request.headers.get("Cookie");
	const cookieToken = (await adminAuthCookie.parse(cookieHeader)) as string | null;

	if (!env.ADMIN_TOKEN || cookieToken !== env.ADMIN_TOKEN) {
		return false;
	}
	
	return true;
}

export function isJsonRequest(request: Request) {
	const accept = request.headers.get('Accept') || '';
	const url = new URL(request.url);
	
	return accept.includes('application/json') || url.searchParams.has('json');
}
