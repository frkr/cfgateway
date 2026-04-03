import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
    index("routes/api.ts", { id: "api-index" }),
    route("panel", "routes/home.tsx"),
    route("*", "routes/api.ts")
] satisfies RouteConfig;
