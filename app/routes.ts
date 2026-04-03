import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
    route("panel", "routes/home.tsx"),
    route("*", "routes/api.server.ts")
] satisfies RouteConfig;
