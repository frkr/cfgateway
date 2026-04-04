import type { Route } from "../../routes/+types/panel";
import database from './database.json';

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

export const action = loader;