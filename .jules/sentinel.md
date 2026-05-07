## 2025-02-14 - Fix authentication token timing attack vulnerability
**Vulnerability:** The application was verifying `ADMIN_TOKEN` authentication tokens using standard string equality (`===`).
**Learning:** This approach is susceptible to timing attacks, where an attacker can theoretically determine the expected token by measuring the time it takes for the comparison to fail. In Cloudflare Workers with `nodejs_compat` enabled, one could use `node:crypto` `timingSafeEqual`, however, for simplicity and to avoid Buffer dependencies, a custom constant-time XOR-based string comparison function (`safeCompare`) can also provide protection.
**Prevention:** Always use constant-time string comparison methods when checking passwords, tokens, API keys, or any secret data.
