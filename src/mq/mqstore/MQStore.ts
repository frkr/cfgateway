import type { MQCFGATEWAYMessage, MQCFGATEWAYType } from '../../front/lib/MQCFGATEWAY';
import database from "./database.json"

export default async function (rawmsg: Message<unknown>, env: Env, type?:MQCFGATEWAYType) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let content = null;
	
	try {
		const r2Object = await env.CFGATEWAY.get(msg.filename);
		if (r2Object) {
			content = await r2Object.text();
		}
		
		await env.DB.prepare(
			database.insert
		).bind(msg.id, msg.filename, content, msg.time, type || msg.type).run();
	} catch (e) {
		console.error("DB error:", e);
	}
	
}
