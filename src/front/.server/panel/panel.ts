import type { Route } from '../../routes/+types/panel';
import database from './database.json';
import type { Message } from '@/database';
import { queueMessage } from '../mainroute/mainroute';
import { checkAdminAuth, isJsonRequest, adminAuthCookie, safeCompare } from './auth';
import { cloudflareContext } from '@/context';

function getCloudflareContext(context: any) {
	return context?.get?.(cloudflareContext) ?? context?.cloudflare;
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const cf = getCloudflareContext(context);
	const url = new URL(request.url);
	const wantsJson = isJsonRequest(request);
	
	const isAuthed = await checkAdminAuth(request, cf.env);
	if (!isAuthed) {
		if (wantsJson) {
			return new Response('Unauthorized', { status: 401 });
		}
		// For initial HTML page load, return an empty state telling frontend it needs auth
		return { requireAuth: true, message: cf.env.VALUE_FROM_CLOUDFLARE, messages: [], isGrouped: true };
	}
	
	const id_parent = params.id_parent || url.searchParams.get('id_parent');
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	
	try {
		let results;
		let isGrouped = false;
		
		if (id_parent) {
			const query = await cf.env.DB.prepare(
				database.selectMessagesByParent
			).bind(id_parent).run();
			results = query.results;
		} else {
			const query = await cf.env.DB.prepare(
				database.selectGroupedMessagesPaged
			).bind(limit, offset).run();
			results = query.results;
			isGrouped = true;
		}
		
		const versionMeta = {
			id: cf.env.CF_VERSION_METADATA?.id,
			tag: cf.env.CF_VERSION_METADATA?.tag,
			timestamp: cf.env.CF_VERSION_METADATA?.timestamp
		};

		const data = {
			message: cf.env.VALUE_FROM_CLOUDFLARE,
			messages: results as unknown as Message[],
			id_parent,
			isGrouped,
			version: versionMeta
		};
		
		if (wantsJson) {
			return Response.json(data);
		}
		return data;
	} catch (e) {
		console.error('DB error:', e);
		const data = { message: cf.env.VALUE_FROM_CLOUDFLARE, messages: [], isGrouped: !id_parent };
		if (wantsJson) {
			return Response.json(data);
		}
		return data;
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	const cf = getCloudflareContext(context);
	if (request.method === 'POST') {
		try {
			const body = await request.json() as { intent?: string; message?: Message; token?: string };
			
			if (body.intent === 'login') {
				if (safeCompare(body.token, cf.env.ADMIN_TOKEN)) {
					const cookieStr = await adminAuthCookie.serialize(body.token, {
						secure: new URL(request.url).protocol === 'https:'
					});
					return Response.json({ success: true }, {
						headers: {
							'Set-Cookie': cookieStr
						}
					});
				}
				return Response.json({ success: false, error: 'Invalid token' }, { status: 401 });
			}
			
			const isAuthed = await checkAdminAuth(request, cf.env);
			if (!isAuthed) {
				return new Response('Unauthorized', { status: 401 });
			}
			
			if (body.intent === 'retry' && body.message) {
				const { message } = body;
				await queueMessage(message.content, message.url, cf.env, true);
				return Response.json({ success: true });
			}
		} catch (e) {
			console.error('Action error:', e);
			return Response.json({ success: false, error: String(e) }, { status: 400 });
		}
	}
	
	const isAuthed = await checkAdminAuth(request, cf.env);
	if (!isAuthed) {
		return new Response('Unauthorized', { status: 401 });
	}
	
	return loader({ request, context, params: {} } as Route.LoaderArgs);
}
