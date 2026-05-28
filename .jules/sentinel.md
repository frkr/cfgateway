## 2025-02-14 - Fix authentication token timing attack vulnerability
**Vulnerability:** The application was verifying `ADMIN_TOKEN` authentication tokens using standard string equality (`===`).
**Learning:** This approach is susceptible to timing attacks, where an attacker can theoretically determine the expected token by measuring the time it takes for the comparison to fail. In Cloudflare Workers with `nodejs_compat` enabled, one could use `node:crypto` `timingSafeEqual`, however, for simplicity and to avoid Buffer dependencies, a custom constant-time XOR-based string comparison function (`safeCompare`) can also provide protection.
**Prevention:** Always use constant-time string comparison methods when checking passwords, tokens, API keys, or any secret data.

## 2025-02-14 - Fix Server-Side Request Forgery (SSRF) via invalid protocols
**Vulnerability:** The application was verifying if `destiny` and `callback` fields were valid URLs in `src/front/.server/panel/paths.ts`, but it didn't restrict the URL protocol to HTTP/HTTPS.
**Learning:** `new URL()` simply validates the string as any URL (e.g., `ftp://`, `file://`, `data://`). When used in server-side `fetch` calls, an attacker could abuse these URL inputs to make the application read local files or connect to internal services via SSRF (Server-Side Request Forgery).
**Prevention:** Always restrict user-provided URLs intended for external HTTP requests to `http:` and `https:` protocols. Validate `url.protocol` explicitly.
