import type { MQCFGATEWAYMessage } from '@/MQCFGATEWAY';

export default async function (rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	// Process
	await env.MQCFGATEWAY.send({
		...msg,
		type: 'process'
	} as MQCFGATEWAYMessage, {
		contentType: "json",
	});
	// Store
	await env.MQCFGATEWAY.send({
		...msg,
		type: 'store'
	} as MQCFGATEWAYMessage, {
		contentType: "json",
	});
	
}