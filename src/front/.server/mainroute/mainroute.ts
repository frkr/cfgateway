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

async function handleSync(request: Request, content: string, routeRow: PathRouteRow, env: Env, ctx: ExecutionContext, lab = false) {
	const route = toPathRoute(routeRow);
	const asyncConfig = toPathRouteAsync(route);

	// 1. IN - Prepare recording in background
	const inTime = new Date();
	const inId = await randomHEX();
	const inFilename = mqfilename(inTime, inId);

	ctx.waitUntil((async () => {
		await env.CFGATEWAY.put(inFilename, content);
		await env.MQCFGATEWAY.send({
			id: inId,
			url: request.url,
			filename: inFilename,
			type: 'store',
			time: inTime.getTime(),
			lab
		} as MQCFGATEWAYMessage, { contentType: 'json' });
	})());

	// 2. DESTINY - Perform fetch
	const headers = new Headers();
	const headersRecord = toHeadersRecord(route.headersDestiny);
	for (const [key, value] of Object.entries(headersRecord)) {
		headers.set(key, value);
	}
	if (route.contentTypeDestiny) {
		headers.set('Content-Type', route.contentTypeDestiny);
	}

	const destinyResponse = await fetch(asyncConfig.destiny!, {
		method: asyncConfig.methodDestiny || 'POST',
		headers: headers,
		body: content || null
	});

	const destinyBody = await destinyResponse.text();
	const destinyTime = new Date();

	// 3. OUT and CALLBACK - Prepare recording in background
	ctx.waitUntil((async () => {
		const outContent: MQCFGATEWAYMessageAsync = {
			...asyncConfig,
			content: destinyBody
		};

		const records: Promise<any>[] = [];

		// OUT log
		const outId = await randomHEX();
		const outFilename = mqfilename(destinyTime, outId);
		records.push(env.CFGATEWAY.put(outFilename, JSON.stringify(outContent)));
		records.push(env.MQCFGATEWAY.send({
			id: inId,
			url: asyncConfig.destiny,
			filename: outFilename,
			time: destinyTime.getTime(),
			type: 'out',
			lab
		} as MQCFGATEWAYMessage, { contentType: 'json' }));

		// CALLBACK log and trigger
		if (asyncConfig.callback) {
			const cbId = await randomHEX();
			const cbFilename = mqfilename(destinyTime, cbId);
			records.push(env.CFGATEWAY.put(cbFilename, JSON.stringify(outContent)));
			records.push(env.MQCFGATEWAY.send({
				id: inId,
				url: asyncConfig.callback,
				filename: cbFilename,
				time: destinyTime.getTime(),
				type: 'callback',
				lab
			} as MQCFGATEWAYMessage, { contentType: 'json' }));
		}

		await Promise.allSettled(records);
	})());

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
async function handleRequest(request: Request, env: Env, ctx: ExecutionContext, lab = false) {
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

			if (pathname.startsWith('/sync/')) {
				const normalizedPath = normalizePathKey(pathname.substring(6));
				if (!normalizedPath) {
					throw new Error('Sync path is required.');
				}

				await ensurePathRoutesTable(env);
				const route = await env.DB.prepare(database.selectByPath).bind(normalizedPath).first<PathRouteRow>();
				if (!route) {
					throw new Error(`Sync route not found for path: ${normalizedPath}`);
				}

				return await handleSync(request, content, route, env, ctx, lab);
			}

			const normalizedPath = normalizePathKey(pathname);
			if (normalizedPath) {
				await ensurePathRoutesTable(env);
				const route = await env.DB.prepare(database.selectByPath).bind(normalizedPath).first<PathRouteRow>();

				if (route && route.is_async === 0) {
					return await handleSync(request, content, route, env, ctx, lab);
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
	return handleRequest(request, context.cloudflare.env, context.cloudflare.ctx);
}

export async function action({ request, context }: Route.ActionArgs) {
	return handleRequest(request, context.cloudflare.env, context.cloudflare.ctx);
}
