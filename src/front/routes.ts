import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
    index("routes/mainroute.ts", { id: "api-index" }),
    route("panel", "routes/panel.tsx", { id: "panel-index" }),
    route("panel/:id_parent", "routes/panel.tsx", { id: "panel-detail" }),
    route("panel/messages", "routes/panel.messages.ts"),
    route("*", "routes/mainroute.ts")
] satisfies RouteConfig;
