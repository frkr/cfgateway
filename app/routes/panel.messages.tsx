import type { Route } from "./+types/panel.messages";
import database from "./panel.messages/database.json";

export async function loader({ context }: Route.LoaderArgs) {
  try {
    const { results } = await context.cloudflare.env.DB.prepare(
      database.selectMessages
    ).run();
    return { messages: results as Array<{ id: string; filename: string; content: string; processed_at: number; status: string }> };
  } catch (e) {
    console.error("DB error:", e);
    return { messages: [] };
  }
}