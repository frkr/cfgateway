import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import MQStore from '../mqstore/MQStore';
import mqfilename from '@/mqfilename';
import randomHEX from '@/randomHEX';

export default async function(rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let path: string | null = null;
	try {
		path = new URL(msg.url).pathname;
	} catch (e) {
	}
	
	if (path === '/store') {
		
		// Noop
		
	} else if (path === '/async') {
		
		let asyncMsg = rawmsg.body as MQCFGATEWAYMessageAsync;
		
		if (!asyncMsg.destiny) {
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
			
			let destinyResponse = await fetch(asyncMsg.destiny, {
				method: asyncMsg.method || 'POST',
				headers: headers,
				body: asyncMsg.content
			});
			
			if (!destinyResponse.ok) {
				throw new Error(`Destiny fetch failed with status ${destinyResponse.status}`);
			}
			
			const destinyContent = await destinyResponse.text();
			
			// Store response of Destiny
			let destinyTime = new Date();
			let destinyNextId = await randomHEX();
			let destinyFilename = mqfilename(destinyTime, destinyNextId);
			await env.CFGATEWAY.put(destinyFilename, destinyContent);
			
			await env.MQCFGATEWAY.send({
				id: destinyNextId,
				url: asyncMsg.destiny,
				filename: destinyFilename,
				time: destinyTime.getTime(),
				type: 'internal',
				id_parent: msg.id
			} as MQCFGATEWAYMessage, {
				contentType: 'json'
			});
			
			if (asyncMsg.callback) {
				let callbackResponse = await fetch(asyncMsg.callback, {
					method: 'POST',
					headers: {
						'Content-Type': destinyResponse.headers.get('Content-Type') || 'text/plain'
					},
					body: destinyContent
				});
				
				let callbackContent = await callbackResponse.text();
				
				// Store response of Callback
				let callbackTime = new Date();
				let callbackNextId = await randomHEX();
				let callbackFilename = mqfilename(callbackTime, callbackNextId);
				await env.CFGATEWAY.put(callbackFilename, callbackContent);
				
				await env.MQCFGATEWAY.send({
					id: destinyNextId,
					url: asyncMsg.destiny,
					filename: destinyFilename,
					time: destinyTime.getTime(),
					type: 'internal',
					id_parent: msg.id
				} as MQCFGATEWAYMessage, {
					contentType: 'json'
				});
				
			}
			
		} catch (error) {
			console.error('Error processing async message:', error);
			if (rawmsg.attempts < 5) {
				rawmsg.retry({ delaySeconds: 10 });
			} else {
				throw error; // Let it go to DLQ
			}
		}
		
	} else {
		
		// Lost
		
	}
	
}