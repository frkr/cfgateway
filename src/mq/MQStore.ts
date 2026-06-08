import type { MQCFGATEWAYMessage, MQCFGATEWAYType } from '@/MQCFGATEWAY';
import database from './database.json';
import randomHEX from '@/randomHEX';
import { readR2Text } from '@/mqr2';

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
	
	let content = props?.notread ? null : await readR2Text(env.CFGATEWAY, msg?.filename);
	
	await env.DB.prepare(
		database.insert
	).bind(await randomHEX(), msg.id, msg.url, msg.filename, content, props?.resettime ? Date.now() : msg.time, props?.type || msg.type, msg.lab ? 1 : 0).run();
	
}
