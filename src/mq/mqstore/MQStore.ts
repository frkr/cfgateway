import type { MQCFGATEWAYMessage, MQCFGATEWAYType } from '@/MQCFGATEWAY';
import database from "./database.json"
import randomHEX from '@/randomHEX';

export default async function (rawmsg: Message<unknown>, env: Env, type?:MQCFGATEWAYType, resettime?:boolean) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let content = null;
	
		let r2Object = await env.CFGATEWAY.get(msg.filename);
		if (r2Object) {
			content = await r2Object.text();
		}
		
		await env.DB.prepare(
			database.insert
		).bind(await randomHEX(), msg.id, msg.url, msg.filename, content, resettime ? Date.now(): msg.time, type || msg.type).run();
	
}
