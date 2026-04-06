import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import mqfilename from '@/mqfilename';
import randomHEX from '@/randomHEX';

export default async function(rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let path: string | null = null;
	try {
		path = new URL(msg.url).pathname;
	} catch (e) {
	}
	
	if (path?.startsWith('/store')) {
		
		// Noop
		
	} else if (path?.startsWith('/async')) {
		
		let content: any | null = null;
		try {
			let r2Object = await env.CFGATEWAY.get(msg.filename);
			if (r2Object) {
				content = JSON.parse(await r2Object.text());
			}
		} catch (e) {
			console.error('Error reading file from R2:', e);
		}
		
		let asyncMsg = content as MQCFGATEWAYMessageAsync;
		
		if (
			!asyncMsg.destiny ||
			(msg.type === 'callback' && !asyncMsg.callback)
		) {
			return;
		}
		
		try {
			let headers = new Headers();
			if (asyncMsg.headers) {
				for (let [key, value] of Object.entries(asyncMsg.headers)) {
					headers.set(key, value);
				}
			}
			if (asyncMsg.contentType) {
				headers.set('Content-Type', asyncMsg.contentType);
			}
			
			let destinyResponse = await fetch((msg.type === 'callback' ? asyncMsg.callback : asyncMsg.destiny) as string, {
				method: asyncMsg.method || 'POST',
				headers: headers,
				body: asyncMsg.content || null
			});
			
			if (!destinyResponse.ok) {
				throw new Error(`Fetch failed with status ${destinyResponse.status}`);
			}
			
			const destinyContent = await destinyResponse.text();
			
			// Store response of Destiny
			let destinyTime = new Date();
			let destinyNextId = await randomHEX();
			let destinyFilename = mqfilename(destinyTime, destinyNextId);
			await env.CFGATEWAY.put(destinyFilename, destinyContent);
			
			await env.MQCFGATEWAY.send({
				id: msg.id,
				url: asyncMsg.destiny,
				filename: destinyFilename,
				time: destinyTime.getTime(),
				type: msg.type === 'callback' ? 'internal' : 'out',
				id_parent: msg.id
			} as MQCFGATEWAYMessage, {
				contentType: 'json'
			});
			
			if (msg.type !== 'callback') {
				
				await env.MQCFGATEWAY.send({
					id: msg.id,
					url: asyncMsg.destiny,
					filename: destinyFilename,
					time: destinyTime.getTime(),
					type: 'callback'
				} as MQCFGATEWAYMessage, {
					contentType: 'json'
				});
			}
			
		} catch (error) {
			console.error('Error processing async message:', error);
			if (rawmsg.attempts < 5) {
				rawmsg.retry({ delaySeconds: 10 });
				throw new Error('Retrying...');
			} else {
				throw error; // Let it go to DLQ
			}
		}
		
	} else {
		
		// Lost
		
	}
	
}