import type { MQCFGATEWAYMessage } from '../../front/lib/MQCFGATEWAY';

export default async function (rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	// Out
	await env.MQCFGATEWAY.send({
		...msg,
		type: 'out'
	} as MQCFGATEWAYMessage, {
		contentType: "json",
	});
	
}