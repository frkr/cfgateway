import MQStore from './MQStore';
import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
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
	
	if (!asyncContent || !asyncContent.destiny) {
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
		
		let destinyResponse = await fetch(asyncContent.destiny, {
			method: asyncContent.method || 'POST',
			headers: headers,
			body: asyncContent.content || null
		});
		
		if (!destinyResponse.ok) {
			throw new Error(`Fetch failed with status ${destinyResponse.status}`);
		}
		
		const destinyContent: MQCFGATEWAYMessageAsync = {
			...asyncContent,
			content: await destinyResponse.text()
		};
		
		// Store response of Destiny
		let destinyTime = new Date();
		let destinyNextId = await randomHEX();
		let destinyFilename = mqfilename(destinyTime, destinyNextId);
		await env.CFGATEWAY.put(destinyFilename, JSON.stringify(destinyContent));
		
		if (asyncContent.callback) {
			await env.MQCFGATEWAY.send({
				id: msg.id,
				url: asyncContent.callback,
				filename: destinyFilename,
				time: destinyTime.getTime(),
				type: 'callback',
				lab: msg.lab
			} as MQCFGATEWAYMessage, {
				contentType: 'json'
			});
		}
		
		await env.MQCFGATEWAY.send({
			id: msg.id,
			url: asyncContent.destiny,
			filename: destinyFilename,
			time: destinyTime.getTime(),
			type: 'out',
			lab: msg.lab
		} as MQCFGATEWAYMessage, {
			contentType: 'json'
		});
		
	} catch (error) {
		console.error('Error processing async message destiny:', error);
		if (rawmsg.attempts < 5) {
			rawmsg.retry({ delaySeconds: 10 });
			throw new Error('Retrying...');
		} else {
			throw error; // Let it go to DLQ
		}
	}
}