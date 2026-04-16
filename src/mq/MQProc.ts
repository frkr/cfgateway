import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import database from '@/pathroute.database.json';
import { ensurePathRoutesTable, normalizePathKey, toPathRoute, toPathRouteAsync, type PathRouteRow } from '@/pathroute';
import MQStore from './MQStore';
import MQDestiny from './MQDestiny';

async function storeLost(rawmsg: Message<unknown>, env: Env) {
	await MQStore(rawmsg, env, {
		type: 'lost',
		resettime: true
	});
}

async function hydrateDynamicRoute(msg: MQCFGATEWAYMessage, route: PathRouteRow, env: Env) {
	if (!msg.filename) {
		return false;
	}
	
	const r2Object = await env.CFGATEWAY.get(msg.filename);
	if (!r2Object) {
		return false;
	}
	
	const rawContent = await r2Object.text();
	let asyncContent: MQCFGATEWAYMessageAsync = {
		content: rawContent
	};
	
	try {
		const parsed = JSON.parse(rawContent);
		if (parsed && typeof parsed === 'object') {
			asyncContent = parsed as MQCFGATEWAYMessageAsync;
		}
	} catch (e) {
	}
	
	Object.assign(asyncContent, toPathRouteAsync(toPathRoute(route)));
	
	await env.CFGATEWAY.put(msg.filename, JSON.stringify(asyncContent));
	
	return true;
}

export default async function(rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let path: string | null = null;
	try {
		path = msg.url ? new URL(msg.url).pathname : null;
	} catch (e) {
	}
	
	if (path?.startsWith('/store')) {
		
		// Noop
		
	} else if (path?.startsWith('/async')) {
		
		await MQDestiny(rawmsg, env);
		
	} else {
		const normalizedPath = path ? normalizePathKey(path) : '';
		
		if (normalizedPath) {
			await ensurePathRoutesTable(env);
			
			const route = await env.DB.prepare(database.selectByPath).bind(normalizedPath).first<PathRouteRow>();
			if (route && await hydrateDynamicRoute(msg, route, env)) {
				await MQDestiny(rawmsg, env);
				return;
			}
		}
		
		await storeLost(rawmsg, env);
		
	}
	
}