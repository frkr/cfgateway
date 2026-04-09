## 2024-05-24 - Missing Authentication on Admin Panel
**Vulnerability:** The `/panel` and `/panel/messages` routes lacked authentication, exposing sensitive system logs, webhook contents, and retry capabilities to the public.
**Learning:** It is easy to overlook route-level authentication in React Router/Remix style loader/action functions when separating frontend views from backend endpoints. The lack of middleware or global guards led to this gap.
**Prevention:** Always implement an authentication guard (like `requireAuth`) at the very top of `loader` and `action` handlers for sensitive routes, or use layout routes with inherent authentication checks.
