import type { Route } from '../../routes/+types/panel.paths';
import randomHEX from '@/randomHEX';
import database from '@/pathroute.database.json';
import {
	ensurePathRoutesTable,
	isPathRouteMethod,
	normalizeMethodDestiny,
	normalizePathKey,
	PATH_ROUTE_METHODS,
	toHeadersStorage,
	toPathRoute,
	type PathRoute,
	type PathRouteHeaderEntry,
	type PathRouteRow
} from '@/pathroute';
import { checkAdminAuth, isJsonRequest } from './auth';

type PathRoutePayload = {
	path: string;
	destiny: string;
	callback?: string;
	methodDestiny: string;
	methodCallback?: string;
	contentTypeDestiny?: string;
	contentTypeCallback?: string;
	headersDestiny?: PathRouteHeaderEntry[];
	headersCallback?: PathRouteHeaderEntry[];
	enabled?: boolean;
};

async function loadRoutes(env: Env) {
	await ensurePathRoutesTable(env);
	
	const query = await env.DB.prepare(database.selectAll).run();
	const rows = (query.results || []) as unknown as PathRouteRow[];
	
	return rows.map(toPathRoute);
}

function buildData(env: Env, routes: PathRoute[], requireAuth = false) {
	return {
		requireAuth,
		message: env.VALUE_FROM_CLOUDFLARE,
		routes,
		methods: [...PATH_ROUTE_METHODS]
	};
}

function normalizeHeaders(entries: PathRouteHeaderEntry[] | undefined) {
	return (entries || [])
		.map((entry) => ({
			key: String(entry?.key || '').trim(),
			value: String(entry?.value || '')
		}))
		.filter((entry) => entry.key.length > 0);
}

function validatePayload(payload: PathRoutePayload) {
	const path = normalizePathKey(payload.path || '');
	if (!path) {
		throw new Error('Path is required.');
	}
	
	const destiny = String(payload.destiny || '').trim();
	if (!destiny) {
		throw new Error('Destiny is required.');
	}
	
	new URL(destiny);
	
	const methodDestiny = normalizeMethodDestiny(String(payload.methodDestiny || 'POST'));
	if (!isPathRouteMethod(methodDestiny)) {
		throw new Error('Invalid destiny method.');
	}
	
	const callback = String(payload.callback || '').trim();
	if (callback) {
		new URL(callback);
	}
	
	const methodCallback = normalizeMethodDestiny(String(payload.methodCallback || 'POST'));
	if (!isPathRouteMethod(methodCallback)) {
		throw new Error('Invalid callback method.');
	}
	
	return {
		path,
		destiny,
		callback,
		methodDestiny,
		methodCallback,
		contentTypeDestiny: String(payload.contentTypeDestiny || '').trim(),
		contentTypeCallback: String(payload.contentTypeCallback || '').trim(),
		headersDestiny: normalizeHeaders(payload.headersDestiny),
		headersCallback: normalizeHeaders(payload.headersCallback),
		enabled: payload.enabled !== false
	};
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const wantsJson = isJsonRequest(request);
	
	const isAuthed = await checkAdminAuth(request, context.cloudflare.env);
	if (!isAuthed) {
		if (wantsJson) {
			return new Response('Unauthorized', { status: 401 });
		}
		
		return buildData(context.cloudflare.env, [], true);
	}
	
	try {
		const routes = await loadRoutes(context.cloudflare.env);
		const data = buildData(context.cloudflare.env, routes);
		
		if (wantsJson) {
			return Response.json(data);
		}
		
		return data;
	} catch (e) {
		console.error('Path routes loader error:', e);
		const data = buildData(context.cloudflare.env, []);
		
		if (wantsJson) {
			return Response.json(data, { status: 500 });
		}
		
		return data;
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	const isAuthed = await checkAdminAuth(request, context.cloudflare.env);
	if (!isAuthed) {
		return new Response('Unauthorized', { status: 401 });
	}
	
	if (request.method !== 'POST') {
		return loader({ request, context, params: {} } as Route.LoaderArgs);
	}
	
	try {
		await ensurePathRoutesTable(context.cloudflare.env);
		
		const body = await request.json() as {
			intent?: string;
			id?: string;
			route?: PathRoutePayload;
		};
		
		if (body.intent === 'delete' && body.id) {
			await context.cloudflare.env.DB.prepare(database.delete).bind(body.id).run();
		} else if (body.intent === 'save' && body.route) {
			const route = validatePayload(body.route);
			const now = Date.now();
			
			if (body.id) {
				await context.cloudflare.env.DB.prepare(database.update)
					.bind(
						route.path,
						route.destiny,
						route.callback || null,
						route.methodDestiny,
						route.methodCallback,
						route.contentTypeDestiny || null,
						route.contentTypeCallback || null,
						toHeadersStorage(route.headersDestiny),
						toHeadersStorage(route.headersCallback),
						route.enabled ? 1 : 0,
						now,
						body.id
					)
					.run();
			} else {
				await context.cloudflare.env.DB.prepare(database.insert)
					.bind(
						await randomHEX(),
						route.path,
						route.destiny,
						route.callback || null,
						route.methodDestiny,
						route.methodCallback,
						route.contentTypeDestiny || null,
						route.contentTypeCallback || null,
						toHeadersStorage(route.headersDestiny),
						toHeadersStorage(route.headersCallback),
						route.enabled ? 1 : 0,
						now,
						now
					)
					.run();
			}
		} else {
			throw new Error('Invalid action payload.');
		}
		
		const routes = await loadRoutes(context.cloudflare.env);
		
		return Response.json({
			success: true,
			...buildData(context.cloudflare.env, routes)
		});
	} catch (e) {
		console.error('Path routes action error:', e);
		
		return Response.json({
			success: false,
			error: String(e)
		}, { status: 400 });
	}
}
