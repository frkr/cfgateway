//region Imports
import type { MQCFGATEWAYMessage } from '~/lib/MQCFGATEWAY';
import { createRequestHandler } from 'react-router';
import { HTTP_OK } from '~/lib/httpcodes';
import MQStore from './mq/MQStore';
import MQProc from './mq/MQProc';
import MQCallback from './mq/MQCallback';
import database from './mq/database.json';
//endregion

//region Inicializacao React Router
declare module 'react-router' {
	export interface AppLoadContext {
		cloudflare: {
			env: Env;
			ctx: ExecutionContext;
		};
	}
}

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE
);
//endregion

/**
 * Cloudflare Worker Entry Point
 */
export default {
	
	// A função abaixo deve ficar simples e inalterada. Pedir permissao para o usuario se precisar alterar.
	async fetch(request, env, ctx) {
		// TODO Facebook verification
		// let facebook = false;
		// try {
		//   facebook = request.cf?.asOrganization === "Facebook";
		// } catch (e) {
		// }
		//
		// if (facebook && request.method === 'GET') {
		//   return challenge(env.META_VERIFY, request);
		
		if (request.method === 'OPTIONS') {
			return HTTP_OK();
		}
		return requestHandler(request, {
			cloudflare: { env, ctx }
		});
	},
	
	// Implementation for deleting old files from R2
	async scheduled(event, env, ctx) {
		const MAX_AGE_DAYS = Number(env.MAX_AGE_DAYS || 30);
		const now = Date.now();
		const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
		
		let truncated = true;
		let cursor: string | undefined;
		
		while (truncated) {
			const result: R2Objects = await env.CFGATEWAY.list({ cursor });
			for (const object of result.objects) {
				if (now - object.uploaded.getTime() > maxAgeMs) {
					await env.CFGATEWAY.delete(object.key);
				}
			}
			truncated = result.truncated;
			cursor = result.truncated ? result.cursor : undefined;
		}

		await env.DB.prepare(database.deleteOld).bind(now - maxAgeMs).run();
	},
	
	async queue(batch, env): Promise<void> {
		if (batch.messages.length === 0) return;
		if (batch.queue === 'mqcfgateway-dlq') {
			await Promise.allSettled(
				batch.messages.map(async (rawmsg) => {
					try {
						await MQStore(rawmsg, env, {
							type: 'dlq'
						});
						rawmsg.ack();
					} catch (e) {
						console.error('MQDeadLetter error:', e);
					}
				})
			);
			return;
		}

		await Promise.allSettled(
			batch.messages.map(async (rawmsg) => {
				try {
					let msg = rawmsg.body as MQCFGATEWAYMessage;
					
					if (msg.type === 'in') {

						// Store
						await env.MQCFGATEWAY.send({
							...msg,
							type: 'store'
						} as MQCFGATEWAYMessage, {
							contentType: 'json'
						});

						await MQProc(rawmsg, env);

					} else if (msg.type === 'store') {

						await MQStore(rawmsg, env, {
							type: 'in'
						});

					} else if (msg.type === 'callback') {

						await MQCallback(rawmsg, env);

					} else if (msg.type === 'out') {

						await MQStore(rawmsg, env, {
							type: 'callback'
						});

					} else if (msg.type === 'internal') {

						await MQStore(rawmsg, env, {
							type: 'internal'
						});

					} else {
						await MQStore(rawmsg, env, {
							type: 'lost'
						});
					}
					
					rawmsg.ack();
				} catch (e) {
					// Vai pro DLQ
				}
			})
		);
	}
} satisfies ExportedHandler<Env>;
