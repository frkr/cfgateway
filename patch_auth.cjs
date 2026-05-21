const fs = require('fs');
const file = 'src/front/.server/panel/auth.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `import { createCookie } from "react-router";
import * as crypto from "node:crypto";

export const adminAuthCookie = createCookie("admin_token", {
  maxAge: 604_800, // one week
  httpOnly: true,
  path: "/",
  sameSite: "lax", // Protects against CSRF but allows the cookie to be sent with top-level navigations
});

export function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
	if (typeof a !== 'string' || typeof b !== 'string') {
		return false;
	}
	const hashA = crypto.createHash('sha256').update(a).digest();
	const hashB = crypto.createHash('sha256').update(b).digest();
	return crypto.timingSafeEqual(hashA, hashB);
}`;

code = code.replace(/import { createCookie } from "react-router";[\s\S]*?return mismatch === 0;\n}/, replacement);

fs.writeFileSync(file, code);
