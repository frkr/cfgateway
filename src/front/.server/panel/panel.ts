import type { Route } from '../../routes/+types/panel';
import database from './database.json';
import type { Message } from '@/database';
import { storeMessage } from '../mainroute/mainroute';
import { checkAdminAuth, isJsonRequest } from './auth';

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const wantsJson = isJsonRequest(request);

	if (!checkAdminAuth(request, context.cloudflare.env)) {
		if (wantsJson) {
			return new Response('Unauthorized', { status: 401 });
		}
		// For initial HTML page load, return an empty state telling frontend it needs auth
		return { requireAuth: true, message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE, messages: [], isGrouped: true };
	}

	const id_parent = params.id_parent || url.searchParams.get('id_parent');
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	
	try {
		let results;
		let isGrouped = false;

		if (id_parent) {
			const query = await context.cloudflare.env.DB.prepare(
				database.selectMessagesByParent
			).bind(id_parent).run();
			results = query.results;
		} else {
			const query = await context.cloudflare.env.DB.prepare(
				database.selectGroupedMessagesPaged
			).bind(limit, offset).run();
			results = query.results;
			isGrouped = true;
		}
		
		const data = {
			message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
			messages: results as unknown as Message[],
			id_parent,
			isGrouped
		};
		
		if (wantsJson) {
			return Response.json(data);
		}
		return data;
	} catch (e) {
		console.error('DB error:', e);
		const data = { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE, messages: [], isGrouped: !id_parent };
		if (wantsJson) {
			return Response.json(data);
		}
		return data;
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	if (!checkAdminAuth(request, context.cloudflare.env)) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (request.method === 'POST') {
		try {
			const body = await request.json() as { intent?: string; message?: Message };
			if (body.intent === 'retry' && body.message) {
				const { message } = body;
				await storeMessage(message.content, message.url, context.cloudflare.env, true);
				return Response.json({ success: true });
			}
		} catch (e) {
			console.error('Action error:', e);
			return Response.json({ success: false, error: String(e) }, { status: 400 });
		}
	}
	
	return loader({ request, context, params: {} } as Route.LoaderArgs);
}
