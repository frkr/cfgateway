import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import MQStore from '../mqstore/MQStore';
import mqfilename from '@/mqfilename';
import randomHEX from '@/randomHEX';

export default async function (rawmsg: Message<unknown>, env: Env) {

	let msg = rawmsg.body as MQCFGATEWAYMessage;

	let url: URL;
	try {
		url = new URL(msg.url);
	} catch (e) {
		console.error("Invalid URL in message:", msg.url);
		return;
	}
	let path = url.pathname;

	if (path === '/store') {

		// Noop

	} else if (path === '/async') {

		const asyncMsg = rawmsg.body as MQCFGATEWAYMessageAsync;

		if (!asyncMsg.destiny) {
			console.error("Missing destiny in async message");
			return;
		}

		try {
			const headers = new Headers();
			if (asyncMsg.headers) {
				for (const [key, value] of Object.entries(asyncMsg.headers)) {
					headers.set(key, value);
				}
			}
			if (asyncMsg.contentType) {
				headers.set('Content-Type', asyncMsg.contentType);
			}

			const destinyResponse = await fetch(asyncMsg.destiny, {
				method: asyncMsg.method || 'POST',
				headers: headers,
				body: (asyncMsg.method === 'GET' || asyncMsg.method === 'HEAD') ? undefined : asyncMsg.content,
			});

			if (!destinyResponse.ok) {
				throw new Error(`Destiny fetch failed with status ${destinyResponse.status}`);
			}

			const destinyContent = await destinyResponse.text();

			// Store response of Destiny
			const destinyTime = new Date();
			const destinyNextId = await randomHEX();
			const destinyFilename = mqfilename(destinyTime, destinyNextId);
			await env.CFGATEWAY.put(destinyFilename, destinyContent);

			await MQStore({
				...rawmsg,
				body: {
					id: destinyNextId,
					url: asyncMsg.destiny,
					filename: destinyFilename,
					time: destinyTime.getTime(),
					type: 'process'
				} as MQCFGATEWAYMessage
			}, env, 'process', false, msg.id);

			if (asyncMsg.callback) {
				const callbackResponse = await fetch(asyncMsg.callback, {
					method: 'POST',
					headers: {
						'Content-Type': destinyResponse.headers.get('Content-Type') || 'text/plain',
					},
					body: destinyContent,
				});

				const callbackContent = await callbackResponse.text();

				// Store response of Callback
				const callbackTime = new Date();
				const callbackNextId = await randomHEX();
				const callbackFilename = mqfilename(callbackTime, callbackNextId);
				await env.CFGATEWAY.put(callbackFilename, callbackContent);

				await MQStore({
					...rawmsg,
					body: {
						id: callbackNextId,
						url: asyncMsg.callback,
						filename: callbackFilename,
						time: callbackTime.getTime(),
						type: 'process'
					} as MQCFGATEWAYMessage
				}, env, 'process', false, msg.id);
			}

		} catch (error) {
			console.error("Error processing async message:", error);
			if (rawmsg.attempts < 5) {
				rawmsg.retry({ delaySeconds: 10 });
			} else {
				throw error; // Let it go to DLQ
			}
		}

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