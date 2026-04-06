import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';

export default async function (rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let path = new URL(msg.url).pathname;
	
	if (path === '/store') {
		
		// Noop
		
	} else if (path === '/async') {
	
		// TODO fazer uma request usando fetch para o endpoint 'destiny' da mensagem rawmsg as MQCFGATEWAYMessageAsync
		const asyncMsg = rawmsg.body as MQCFGATEWAYMessageAsync;
		const response = await fetch(asyncMsg.destiny || '', {
			method: asyncMsg.method || 'POST',
			//headers: {...asyncMsg.headers || {} } ,
			body: asyncMsg.content,
			// contentType: asyncMsg.contentType || 'json',
		});
		// TODO fazer o callback da mensagem rawmsg com o response
		// TODO gravar o response do Destiny e do Callback
		// TODO fazer metodos de retry
		
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