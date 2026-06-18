## 2025-02-14 - Fix authentication token timing attack vulnerability
**Vulnerability:** The application was verifying `ADMIN_TOKEN` authentication tokens using standard string equality (`===`).
**Learning:** This approach is susceptible to timing attacks, where an attacker can theoretically determine the expected token by measuring the time it takes for the comparison to fail. In Cloudflare Workers with `nodejs_compat` enabled, one could use `node:crypto` `timingSafeEqual`, however, for simplicity and to avoid Buffer dependencies, a custom constant-time XOR-based string comparison function (`safeCompare`) can also provide protection.
**Prevention:** Always use constant-time string comparison methods when checking passwords, tokens, API keys, or any secret data.

## 2025-02-14 - Fix Server-Side Request Forgery (SSRF) via invalid protocols
**Vulnerability:** The application was verifying if `destiny` and `callback` fields were valid URLs in `src/front/.server/panel/paths.ts`, but it didn't restrict the URL protocol to HTTP/HTTPS.
**Learning:** `new URL()` simply validates the string as any URL (e.g., `ftp://`, `file://`, `data://`). When used in server-side `fetch` calls, an attacker could abuse these URL inputs to make the application read local files or connect to internal services via SSRF (Server-Side Request Forgery).
**Prevention:** Always restrict user-provided URLs intended for external HTTP requests to `http:` and `https:` protocols. Validate `url.protocol` explicitly.
## 2024-05-14 - Prevent SSRF in path routes configuration
**Vulnerability:** The application was vulnerable to Server-Side Request Forgery (SSRF) because the path routes API (`src/front/.server/panel/paths.ts`) did not validate the protocol of user-provided `destiny` and `callback` URLs, potentially allowing malicious internal URLs like `file://` or `gopher://`.
**Learning:** Simply using `new URL(urlString)` is insufficient for security if the resulting protocol is not validated. This can enable SSRF attacks, allowing potential internal network probing or unauthorized access to internal resources.
**Prevention:** Always strictly enforce `http:` or `https:` protocols using the `URL` object (`url.protocol === "http:" || url.protocol === "https:"`) when accepting user-provided outbound request destinations.

## 2025-02-14 - Improve constant-time string comparison against V8 optimizations
**Vulnerability:** The application was verifying `ADMIN_TOKEN` authentication tokens using a custom constant-time XOR-based string comparison function (`safeCompare`), but JavaScript engines (like V8) can optimize string operations (e.g. via JIT, early bailouts, or different string representations) rendering the custom loop vulnerable to subtle timing attacks.
**Learning:** Custom JavaScript loop implementations for constant-time comparisons can be defeated by modern JS engine optimizations. Hashing strings first with a fixed-length cryptographic hash (like SHA-256) and comparing the hashes with `crypto.timingSafeEqual` is the most reliable cross-platform pattern to prevent timing leaks.
**Prevention:** Avoid writing custom constant-time string comparison loops. For sensitive comparisons (passwords, tokens, HMACs), always hash both inputs with SHA-256 and compare the output using `node:crypto.timingSafeEqual`.
