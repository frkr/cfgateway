import type { MQCFGATEWAYMessage } from '@/MQCFGATEWAY';

export default async function (rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	// Out
	await env.MQCFGATEWAY.send({
		...msg,
		type: 'out',
		time: Date.now()
	} as MQCFGATEWAYMessage, {
		contentType: "json",
	});
	
}