import type { Route } from "../../routes/+types/panel";
import database from './database.json';
import type { Message } from '@/database';
import { storeMessage } from '../mainroute/mainroute';

export async function loader({ request, context }: Route.LoaderArgs) {
	const accept = request.headers.get("Accept") || "";
	const url = new URL(request.url);
	const offset = parseInt(url.searchParams.get("offset") || "0");
	const limit = parseInt(url.searchParams.get("limit") || "20");

	try {
		const { results } = await context.cloudflare.env.DB.prepare(
			database.selectMessagesPaged
		).bind(limit, offset).run();

		const data = {
			message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
			messages: results as unknown as Message[]
		};

		if (accept.includes("application/json") || url.searchParams.has("json")) {
			return Response.json(data);
		}
		return data;
	} catch (e) {
		console.error("DB error:", e);
		const data = { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE, messages: [] };
		if (accept.includes("application/json") || url.searchParams.has("json")) {
			return Response.json(data);
		}
		return data;
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	if (request.method === "POST") {
		try {
			const body = await request.json() as { intent?: string; message?: Message };
			if (body.intent === "retry" && body.message) {
				const { message } = body;
				await storeMessage(message.content, message.url, context.cloudflare.env);
				return Response.json({ success: true });
			}
		} catch (e) {
			console.error("Action error:", e);
			return Response.json({ success: false, error: String(e) }, { status: 400 });
		}
	}

	return loader({ request, context } as Route.LoaderArgs);
}
