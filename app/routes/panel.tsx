import type { Route } from "./+types/panel";
import { Welcome } from "~/panel/welcome";
import database from "~/panel/database.json";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CF Gateway" },
    { name: "description", content: "Cloudflare Gateway for routing messages" },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const accept = request.headers.get("Accept") || "";
  try {
    const { results } = await context.cloudflare.env.DB.prepare(
      database.selectMessages
    ).run();
    const data = { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE, messages: results as Array<{ id: string; filename: string; content: string; processed_at: number; status: string }> };
    if (accept.includes("application/json")) {
      return Response.json(data);
    }
    return data;
  } catch (e) {
    console.error("DB error:", e);
    const data = { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE, messages: [] };
    if (accept.includes("application/json")) {
      return Response.json(data);
    }
    return data;
  }
}

export default function Panel({ loaderData: { message, messages } }: Route.ComponentProps) {
  return <Welcome message={message} messages={messages} />;
}