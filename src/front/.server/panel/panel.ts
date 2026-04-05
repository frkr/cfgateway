import type { Route } from "../../routes/+types/panel";

const SELECT_MESSAGES_SQL = "SELECT id, id_parent, filename, content, processed_at, status FROM messages ORDER BY processed_at DESC LIMIT 50";

export async function loader({ request, context }: Route.LoaderArgs) {
	const adminToken = context.cloudflare.env.ADMIN_TOKEN;
	const providedToken = request.headers.get("X-Admin-Token") || request.headers.get("Authorization")?.replace("Bearer ", "");

	if (adminToken !== undefined && adminToken !== null && adminToken !== "" && providedToken !== adminToken) {
		return new Response("Unauthorized", { status: 401 });
	}

	const accept = request.headers.get("Accept") || "";
	try {
		const { results } = await context.cloudflare.env.DB.prepare(
			SELECT_MESSAGES_SQL
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