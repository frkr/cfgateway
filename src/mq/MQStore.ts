import type { MQCFGATEWAYMessage, MQCFGATEWAYType } from '@/MQCFGATEWAY';
import database from './database.json';
import randomHEX from '@/randomHEX';

type MQStoreParams = {
	type?: MQCFGATEWAYType,
	resettime?: boolean,
	notread?: boolean,
}

export default async function(
	rawmsg: Message<unknown>,
	env: Env,
	props?: MQStoreParams
) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let content = null;
	
	try {
		if (!props?.notread && msg?.filename) {
			let r2Object = await env.CFGATEWAY.get(msg.filename);
			if (r2Object) {
				content = await r2Object.text();
			}
		}
	} catch (e) {
		console.error('Error reading file from R2:', e);
	}
	
	await env.DB.prepare(
		database.insert
	).bind(await randomHEX(), msg.id, msg.url, msg.filename, content, props?.resettime ? Date.now() : msg.time, props?.type || msg.type, msg.lab ? 1 : 0).run();
	
}
