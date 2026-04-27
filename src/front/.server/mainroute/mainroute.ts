//region Imports
import type { Route } from '../../routes/+types/mainroute';
import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import { HTTP_CREATED, HTTP_UNPROCESSABLE_ENTITY } from '@/httpcodes';
import randomHEX from '@/randomHEX';
import isEmpty from '@/isEmpty';
import mqfilename from '@/mqfilename';
import {
	ensurePathRoutesTable,
	normalizePathKey,
	toHeadersRecord,
	toPathRoute,
	toPathRouteAsync,
	type PathRouteRow
} from '@/pathroute';
import database from '@/pathroute.database.json';

//endregion

export async function queueMessage(content: string, url: string, env: Env, lab = false, store = false) {
	const agora = new Date();
	const nextId = await randomHEX();
	const fname = mqfilename(agora, nextId);
	
	await env.CFGATEWAY.put(fname, content);
	
	await env.MQCFGATEWAY.send({
		id: nextId,
		url: url,
		filename: fname,
		type: store ? 'store' : 'in',
		time: agora.getTime(),
		lab
	} as MQCFGATEWAYMessage, {
		contentType: 'json'
	});
	
	return { id: nextId, filename: fname, time: agora.getTime() };
}

async function handleSync(request: Request, content: string, routeRow: PathRouteRow, env: Env, ctx: ExecutionContext, lab = false, fullpath: string | null = null) {
	const route = toPathRoute(routeRow);
	const asyncConfig = toPathRouteAsync(route);

	// 1. IN - Start recording immediately (runs concurrently with fetch below)
	const inTime = new Date();
	const inId = await randomHEX();
	const inFilename = mqfilename(inTime, inId);

	const inPromise = Promise.all([
		env.CFGATEWAY.put(inFilename, content),
		env.MQCFGATEWAY.send({
			id: inId,
			url: request.url,
			filename: inFilename,
			type: 'store',
			time: inTime.getTime(),
			lab
		} as MQCFGATEWAYMessage, { contentType: 'json' })
	]);

	// 2. DESTINY - Perform fetch (runs in parallel with inPromise)
	const headers = new Headers();
	const headersRecord = toHeadersRecord(route.headersDestiny);
	for (const [key, value] of Object.entries(headersRecord)) {
		headers.set(key, value);
	}
	if (route.contentTypeDestiny) {
		headers.set('Content-Type', route.contentTypeDestiny);
	}

	const destinyResponse = await fetch(asyncConfig.destiny! + (!fullpath ? '' : fullpath), {
		method: asyncConfig.methodDestiny || request.method,
		headers: headers,
		body: content || null
	});

	const destinyTime = new Date();
	const destinyBody = await destinyResponse.text();

	// OUT log - starts after fetch completes (needs destinyBody)
	const outId = await randomHEX();
	const outFilename = mqfilename(destinyTime, outId);

	const outPromise = Promise.all([
		env.CFGATEWAY.put(outFilename, destinyBody),
		env.MQCFGATEWAY.send({
			id: outId,
			parent: inId,
			url: asyncConfig.destiny,
			filename: outFilename,
			time: destinyTime.getTime(),
			type: 'out',
			lab
		} as MQCFGATEWAYMessage, { contentType: 'json' })
	]);

	// Return response to client
	const responseHeaders = new Headers();
	const contentType = destinyResponse.headers.get('Content-Type');
	if (contentType) {
		responseHeaders.set('Content-Type', contentType);
	}

	await Promise.all([inPromise, outPromise]);

	return new Response(destinyBody, {
		status: destinyResponse.status,
		headers: responseHeaders
	});
}

// Essa função esta perfeita e não deve ser alterada sem permissao do usuário
async function handleRequest(request: Request, env: Env, ctx: ExecutionContext, lab = false, fullpath: string | null = null) {
	try {
		const content = await request.text();
		const { pathname } = new URL(request.url);
		
		if (request.method === 'GET' ||
			(!isEmpty(content) && content.length > 10)
		) {
			if (pathname.startsWith('/store/')) {
				await queueMessage(content, request.url, env, lab, true);
				return HTTP_CREATED();
			}
			if (pathname.startsWith('/async/')) {
				const bearer = request.headers.get('Authorization');
				const token = bearer ? bearer.replace('Bearer ', '') : null;
				
				if (!token || token !== env.ADMIN_TOKEN) {
					throw new Error('Invalid bearer token for /async path.');
				}
				
				await queueMessage(content, request.url, env, lab);
				return HTTP_CREATED();
			}
			
			if (pathname.startsWith('/sync/')) {
				let normalizedPath = normalizePathKey(pathname.substring(6));
				if (!normalizedPath) {
					throw new Error('Sync path is required.');
				}
				let fullpath = null;
				if (normalizedPath.includes('/')) {
					fullpath = normalizedPath.substring(normalizedPath.indexOf('/'));
					normalizedPath = normalizePathKey(normalizedPath.substring(0, normalizedPath.indexOf('/')));
				}
				
				const route = await env.DB.prepare(database.selectByPath).bind(normalizedPath).first<PathRouteRow>();
				if (!route) {
					throw new Error(`Sync route not found for path: ${normalizedPath}`);
				}
				
				return await handleSync(request, content, route, env, ctx, lab, fullpath);
			}
			
			await queueMessage(content, request.url, env, lab);
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
	return handleRequest(request, context.cloudflare.env, context.cloudflare.ctx);
}

export async function action({ request, context }: Route.ActionArgs) {
	return handleRequest(request, context.cloudflare.env, context.cloudflare.ctx);
}
