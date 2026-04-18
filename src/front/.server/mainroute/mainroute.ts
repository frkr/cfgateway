//region Imports
import type { Route } from '../../routes/+types/mainroute';
import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import { HTTP_CREATED, HTTP_UNPROCESSABLE_ENTITY } from '@/httpcodes';
import randomHEX from '@/randomHEX';
import isEmpty from '@/isEmpty';
import mqfilename from '@/mqfilename';
import { ensurePathRoutesTable, normalizePathKey, toHeadersRecord, toPathRoute, toPathRouteAsync, type PathRouteRow } from '@/pathroute';
import database from '@/pathroute.database.json';

//endregion

export async function storeMessage(content: string, url: string, env: Env, lab = false) {
	const agora = new Date();
	const nextId = await randomHEX();
	const fname = mqfilename(agora, nextId);
	
	await env.CFGATEWAY.put(fname, content);
	
	await env.MQCFGATEWAY.send({
		id: nextId,
		url: url,
		filename: fname,
		type: 'in',
		time: agora.getTime(),
		lab
	} as MQCFGATEWAYMessage, {
		contentType: 'json'
	});

	return { id: nextId, filename: fname, time: agora.getTime() };
}

async function handleSync(request: Request, content: string, routeRow: PathRouteRow, env: Env, lab = false) {
	const route = toPathRoute(routeRow);
	const asyncConfig = toPathRouteAsync(route);

	const inputMsg = await storeMessage(content, request.url, env, lab);

	// Prepare destiny request
	const headers = new Headers();
	if (asyncConfig.headersDestiny) {
		for (const [key, value] of Object.entries(asyncConfig.headersDestiny)) {
			headers.set(key, value);
		}
	}
	if (asyncConfig.contentTypeDestiny) {
		headers.set('Content-Type', asyncConfig.contentTypeDestiny);
	}

	const destinyResponse = await fetch(asyncConfig.destiny!, {
		method: asyncConfig.methodDestiny || 'POST',
		headers: headers,
		body: content || null
	});

	const destinyBody = await destinyResponse.text();
	const destinyTime = new Date();
	const destinyNextId = await randomHEX();
	const destinyFilename = mqfilename(destinyTime, destinyNextId);

	const destinyContent: MQCFGATEWAYMessageAsync = {
		...asyncConfig,
		content: destinyBody
	};

	await env.CFGATEWAY.put(destinyFilename, JSON.stringify(destinyContent));

	// Queue recording of out/callback without blocking response
	const records = [
		env.MQCFGATEWAY.send({
			id: inputMsg.id,
			url: asyncConfig.destiny,
			filename: destinyFilename,
			time: destinyTime.getTime(),
			type: 'out',
			lab
		} as MQCFGATEWAYMessage, { contentType: 'json' })
	];

	if (asyncConfig.callback) {
		records.push(
			env.MQCFGATEWAY.send({
				id: inputMsg.id,
				url: asyncConfig.callback,
				filename: destinyFilename,
				time: destinyTime.getTime(),
				type: 'callback',
				lab
			} as MQCFGATEWAYMessage, { contentType: 'json' })
		);
	}

	await Promise.allSettled(records);

	// Return response to client
	const responseHeaders = new Headers();
	const contentType = destinyResponse.headers.get('Content-Type');
	if (contentType) {
		responseHeaders.set('Content-Type', contentType);
	}

	return new Response(destinyBody, {
		status: destinyResponse.status,
		headers: responseHeaders
	});
}

// Essa função esta perfeita e não deve ser alterada sem permissao do usuário
async function handleRequest(request: Request, env: Env, lab = false) {
	try {
		const content = await request.text();
		const { pathname } = new URL(request.url);
		
		if (!isEmpty(content) && content.length > 10) {
			if (pathname.startsWith('/async')) {
				const bearer = request.headers.get('Authorization');
				const token = bearer ? bearer.replace('Bearer ', '') : null;
				
				if (!token || token !== env.ADMIN_TOKEN) {
					throw new Error('Invalid bearer token for /async path.');
				}

				await storeMessage(content, request.url, env, lab);
				return HTTP_CREATED();
			}

			// New Logic for Sync and DB-based routes
			const isExplicitSync = pathname.startsWith('/sync/');
			const searchPath = isExplicitSync ? pathname.substring(6) : pathname;
			const normalizedPath = normalizePathKey(searchPath);

			if (normalizedPath) {
				await ensurePathRoutesTable(env);
				const route = await env.DB.prepare(database.selectByPath).bind(normalizedPath).first<PathRouteRow>();

				if (route) {
					if (isExplicitSync || route.is_async === 0) {
						return await handleSync(request, content, route, env, lab);
					}
				}
			}

			await storeMessage(content, request.url, env, lab);
		} else {
			throw new Error('Content is empty or too short.');
		}
		
		return HTTP_CREATED();
	} catch (e) {
		console.warn('Request', request.method, e);
		// The Fake Promise for 5 seconds exists for delaying response for possible attacks.
		await new Promise((resolve) => setTimeout(resolve, 5000));
		return HTTP_UNPROCESSABLE_ENTITY();
	}
}

export async function loader({ request, context }: Route.LoaderArgs) {
	return handleRequest(request, context.cloudflare.env);
}

export async function action({ request, context }: Route.ActionArgs) {
	return handleRequest(request, context.cloudflare.env);
}
