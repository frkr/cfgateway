import type { MQCFGATEWAYMessage, MQCFGATEWAYType } from '@/MQCFGATEWAY';
import randomHEX from '@/randomHEX';

const INSERT_MESSAGE_SQL = "INSERT INTO messages (id, id_parent, filename, content, processed_at, status) VALUES (?, ?, ?, ?, ?, ?)";

export default async function (rawmsg: Message<unknown>, env: Env, type?:MQCFGATEWAYType, resettime?:boolean) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let content = null;
	
		let r2Object = await env.CFGATEWAY.get(msg.filename);
		if (r2Object) {
			content = await r2Object.text();
		}
		
		await env.DB.prepare(
			INSERT_MESSAGE_SQL
		).bind(await randomHEX(), msg.id, msg.filename, content, resettime ? Date.now(): msg.time, type || msg.type).run();
	
}
