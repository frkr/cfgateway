//region Imports
import { createRequestHandler } from 'react-router';
import { HTTP_OK } from '~/lib/httpcodes';
import type { MQCFGATEWAYMessage } from '~/lib/MQCFGATEWAY';
import MQIn from './mq/mqin/MQIn';
import MQErr from './mq/mqerr/MQErr';
import MQProc from './mq/mqproc/MQProc';
import MQDeadLetter from './mq/mqdlq/MQDeadLetter';
import MQStore from './mq/mqstore/MQStore';
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
		const MAX_AGE_DAYS = 30;
		const now = Date.now();
		const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
		
		let truncated = true;
		let cursor: string | undefined;
		
		while (truncated) {
			const result: R2Objects = await env.CFGATEWAY.list({ cursor });
			for (const object of result.objects) {
				if (now - object.uploaded.getTime() > maxAgeMs) {
					console.log(`Deleting old file: ${object.key}`);
					await env.CFGATEWAY.delete(object.key);
				}
			}
			truncated = result.truncated;
			cursor = result.truncated ? result.cursor : undefined;
		}
	},
	
	async queue(batch, env): Promise<void> {
		if (batch.messages.length === 0) return;
		if (batch.queue === 'mqcfgateway-dlq') {
			for (const rawmsg of batch.messages) {
				try {
					await MQDeadLetter(rawmsg, env);
					rawmsg.ack();
				} catch (e) {
					console.error('MQDeadLetter error:', e);
				}
			}
			return;
		}
		for (const rawmsg of batch.messages) {
			try {
				
				let msg = rawmsg.body as MQCFGATEWAYMessage;
				
				if (msg.type === 'in') {
					
					await MQIn(rawmsg, env);
					
				} else if (msg.type === 'store') {
					
					await MQStore(rawmsg, env, 'in');
					
				} else if (msg.type === 'process') {
					
					await MQProc(rawmsg, env);
					
				} else if (msg.type === 'out') {
					
					await MQStore(rawmsg, env, 'out');
					
				} else if (msg.type === 'internal') {
					
					await MQStore(rawmsg, env, 'internal');
					
				} else {
					
					await MQErr(rawmsg, env);
					
				}
				
				rawmsg.ack();
			} catch (e) {
				await MQErr(rawmsg, env);
			}
		}
	}
} satisfies ExportedHandler<Env>;
