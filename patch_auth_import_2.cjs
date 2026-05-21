const fs = require('fs');
const file = 'src/front/.server/panel/auth.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `import { createCookie } from "react-router";

export const adminAuthCookie = createCookie("admin_token", {
  maxAge: 604_800, // one week
  httpOnly: true,
  path: "/",
  sameSite: "lax", // Protects against CSRF but allows the cookie to be sent with top-level navigations
});

export async function safeCompare(a: string | null | undefined, b: string | null | undefined): Promise<boolean> {
	if (typeof a !== 'string' || typeof b !== 'string') {
		return false;
	}
	const encoder = new TextEncoder();
	const aData = encoder.encode(a);
	const bData = encoder.encode(b);

	const hashA = await crypto.subtle.digest('SHA-256', aData);
	const hashB = await crypto.subtle.digest('SHA-256', bData);

	const a8 = new Uint8Array(hashA);
	const b8 = new Uint8Array(hashB);

	let mismatch = 0;
	for (let i = 0; i < a8.length; i++) {
		mismatch |= a8[i] ^ b8[i];
	}
	return mismatch === 0;
}`;

code = code.replace(/import { createCookie } from "react-router";\nimport crypto from "node:crypto";[\s\S]*?return crypto\.timingSafeEqual\(hashA, hashB\);\n}/, replacement);

code = code.replace(/if \(headerToken && safeCompare\(headerToken, env.ADMIN_TOKEN\)\)/, "if (headerToken && await safeCompare(headerToken, env.ADMIN_TOKEN))");
code = code.replace(/if \(!env.ADMIN_TOKEN \|\| !safeCompare\(cookieToken, env.ADMIN_TOKEN\)\)/, "if (!env.ADMIN_TOKEN || !await safeCompare(cookieToken, env.ADMIN_TOKEN))");

fs.writeFileSync(file, code);
