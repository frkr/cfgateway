import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
    index("routes/mainroute.ts", { id: "api-index" }),
    route("panel", "routes/panel.tsx", { id: "panel-index" }),
    route("panel/paths", "routes/panel.paths.tsx", { id: "panel-paths" }),
    route("panel/paths/data", "routes/panel.paths.data.ts"),
    route("panel/messages", "routes/panel.messages.ts"),
    route("panel/:id_parent", "routes/panel.tsx", { id: "panel-detail" }),
    route("*", "routes/mainroute.ts")
] satisfies RouteConfig;
