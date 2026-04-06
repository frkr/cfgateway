import type { MQCFGATEWAYMessage, MQCFGATEWAYType } from '@/MQCFGATEWAY';
import database from './database.json';
import randomHEX from '@/randomHEX';

type MQStoreParams = {
	type?: MQCFGATEWAYType,
	resettime?: boolean,
	notread?: boolean,
	delete?: boolean
}

export default async function(
	rawmsg: Message<unknown>,
	env: Env,
	props?: MQStoreParams
) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let content = null;
	
	if (!props?.notread) {
		let r2Object = await env.CFGATEWAY.get(msg.filename);
		if (r2Object) {
			content = await r2Object.text();
		}
	}
	if (props?.delete) {
		await env.CFGATEWAY.delete(msg.filename);
	}
	
	await env.DB.prepare(
		database.insert
	).bind(await randomHEX(), msg.id, msg.url, msg.filename, content, props?.resettime ? Date.now() : msg.time, props?.type || msg.type).run();
	
}
