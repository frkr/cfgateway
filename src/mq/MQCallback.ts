import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import MQStore from './MQStore';
import randomHEX from '@/randomHEX';
import mqfilename from '@/mqfilename';

export default async function(rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let asyncContent: MQCFGATEWAYMessageAsync | null = null;
	if (msg.filename) {
		try {
			let r2Object = await env.CFGATEWAY.get(msg.filename);
			if (r2Object) {
				asyncContent = JSON.parse(await r2Object.text());
			}
		} catch (e) {
			console.error('Error reading file from R2:', e);
		}
	}
	
	if (!asyncContent || !asyncContent.callback) {
		await MQStore(rawmsg, env, {
			type: 'lost',
			resettime: true
		});
		return;
	}
	
	try {
		let headers = new Headers();
		if (asyncContent.headers) {
			for (let [key, value] of Object.entries(asyncContent.headers)) {
				headers.set(key, value);
			}
		}
		if (asyncContent.contentType) {
			headers.set('Content-Type', asyncContent.contentType);
		}
		
		let callbackResponse = await fetch(asyncContent.callback, {
			method: 'POST',
			headers: headers,
			body: asyncContent.content || null
		});
		
		if (!callbackResponse.ok) {
			throw new Error(`Fetch failed with status ${callbackResponse.status}`);
		}
		
		const callbackContent: MQCFGATEWAYMessageAsync = {
			...asyncContent,
			content: await callbackResponse.text()
		};
		
		// Store response of callback
		let callbackTime = new Date();
		let callbackNextId = await randomHEX();
		let callbackFilename = mqfilename(callbackTime, callbackNextId);
		await env.CFGATEWAY.put(callbackFilename, JSON.stringify(callbackContent));
		
		await env.MQCFGATEWAY.send({
			id: msg.id,
			url: asyncContent.callback,
			filename: callbackFilename,
			time: callbackTime.getTime(),
			type: 'internal',
			lab: msg.lab
		} as MQCFGATEWAYMessage, {
			contentType: 'json'
		});
		
	} catch (error) {
		console.error('Error processing async message callback:', error);
		if (rawmsg.attempts <= 5) {
			rawmsg.retry({ delaySeconds: 10 });
			throw new Error('Retrying...');
		} else {
			throw error; // Let it go to DLQ
		}
	}
}