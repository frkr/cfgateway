## 2024-05-18 - [CRITICAL] Fix Auth Bypass
**Vulnerability:** Authorization bypass via trailing slash evasion in exact path requests (e.g. `/async` missing the `/async/` prefix check).
**Learning:** `pathname.startsWith('/path/')` is insufficient to protect exactly `/path`. It leaves the root endpoint vulnerable.
**Prevention:** Always use `pathname === '/path' || pathname.startsWith('/path/')` for endpoint protection without a trailing slash.

## 2024-05-18 - [CRITICAL] Fix Server-Side Request Forgery (SSRF)
**Vulnerability:** SSRF via arbitrary protocol injection in webhooks.
**Learning:** Relying on `new URL()` to validate a destination string allows protocols like `file:`, `ftp:`, or `gopher:`, leading to Server-Side Request Forgery.
**Prevention:** Strictly assert `url.protocol === 'http:' || url.protocol === 'https:'` on the parsed URL object.

## 2024-05-18 - [HIGH] Fix Timing Attack in String Comparison
**Vulnerability:** Timing attack possible in the custom string `safeCompare` implementation because JS charCodeAt comparisons inside a loop may still leak tiny amounts of timing data in certain engines, and custom implementations are error-prone.
**Learning:** Custom "constant-time" loops in JavaScript are not guaranteed to be secure against sophisticated timing attacks.
**Prevention:** Use native `node:crypto.timingSafeEqual` after uniformly hashing inputs (e.g. SHA-256) to ensure constant length and comparison.
