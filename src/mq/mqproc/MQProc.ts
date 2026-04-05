import type { MQCFGATEWAYMessage } from '@/MQCFGATEWAY';

export default async function (rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let path = new URL(msg.url).pathname;
	
	if (path === "/store") {
		
		// Store
		await env.MQCFGATEWAY.send({
			...msg,
			type: 'out',
		} as MQCFGATEWAYMessage, {
			contentType: "json",
		});
		
	} else {
		
		// Store - Lost
		await env.MQCFGATEWAY.send({
			...msg,
			type: 'out',
			time: Date.now(),
		} as MQCFGATEWAYMessage, {
			contentType: "json",
		});
		
	}
	
}