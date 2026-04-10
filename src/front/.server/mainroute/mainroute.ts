//region Imports
import type { Route } from '../../routes/+types/mainroute';
import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import { HTTP_CREATED, HTTP_UNPROCESSABLE_ENTITY } from '@/httpcodes';
import randomHEX from '@/randomHEX';
import isEmpty from '@/isEmpty';
import mqfilename from '@/mqfilename';

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
}

const checkAuth = (request: Request, env: Env) => {
	const authHeader = request.headers.get('Authorization');
	const token = authHeader ? authHeader.replace('Bearer ', '') : null;
	if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
		return false;
	}
	return true;
};

const isInternalUrl = (urlString: string | undefined): boolean => {
	if (!urlString) return false;
	try {
		const u = new URL(urlString);
		const host = u.hostname;
		return host === 'localhost' || host.startsWith('127.') || host === '0.0.0.0' || host === '::1' || host.endsWith('.local');
	} catch (e) {
		return false;
	}
};

// Essa função esta perfeita e não deve ser alterada sem permissao do usuário
async function handleRequest(request: Request, env: Env, lab = false) {
	try {
		const content = await request.text();
		
		if (!isEmpty(content) && content.length > 10) {

			const requestUrl = new URL(request.url);
			if (requestUrl.pathname.startsWith('/async')) {
				try {
					const asyncContent = JSON.parse(content) as MQCFGATEWAYMessageAsync;

					const hasInternalDestiny = isInternalUrl(asyncContent.destiny);
					const hasInternalCallback = isInternalUrl(asyncContent.callback);

					if (hasInternalDestiny || hasInternalCallback) {
						if (!checkAuth(request, env)) {
							throw new Error('SSRF validation failed: Internal URL not allowed without valid authentication.');
						}
					}
				} catch (e) {
					if (e instanceof Error && e.message.includes('SSRF validation failed')) {
						throw e;
					}
					// If JSON parsing fails, it's not a valid async message anyway, let it be handled later.
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
