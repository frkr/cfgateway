import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
    index("routes/api.ts", { id: "api-index" }),
    route("panel", "routes/panel.tsx"),
    route("panel/messages", "routes/panel.messages.tsx"),
    route("*", "routes/api.ts")
] satisfies RouteConfig;
