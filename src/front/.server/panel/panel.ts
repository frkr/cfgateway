import type { Route } from '../../routes/+types/panel';
import database from './database.json';
import type { Message } from '@/database';
import { storeMessage } from '../mainroute/mainroute';

const checkAuth = (request: Request, env: Env) => {
	const authHeader = request.headers.get('Authorization');
	const token = authHeader ? authHeader.replace('Bearer ', '') : null;

	if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
		return false;
	}
	return true;
};

export async function loader({ request, context }: Route.LoaderArgs) {
	const accept = request.headers.get('Accept') || '';
	const url = new URL(request.url);
	const isJsonRequest = accept.includes('application/json') || url.searchParams.has('json');

	if (!checkAuth(request, context.cloudflare.env)) {
		if (isJsonRequest) {
			return new Response('Unauthorized', { status: 401 });
		}
		// For initial HTML page load, return an empty state telling frontend it needs auth
		return { requireAuth: true, message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE, messages: [] };
	}

	const offset = parseInt(url.searchParams.get('offset') || '0');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	
	try {
		const { results } = await context.cloudflare.env.DB.prepare(
			database.selectMessagesPaged
		).bind(limit, offset).run();
		
		const data = {
			message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
			messages: results as unknown as Message[]
		};
		
		if (accept.includes('application/json') || url.searchParams.has('json')) {
			return Response.json(data);
		}
		return data;
	} catch (e) {
		console.error('DB error:', e);
		const data = { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE, messages: [] };
		if (accept.includes('application/json') || url.searchParams.has('json')) {
			return Response.json(data);
		}
		return data;
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	if (!checkAuth(request, context.cloudflare.env)) {
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
	
	return loader({ request, context } as Route.LoaderArgs);
}
