//region Imports
import { createRequestHandler } from 'react-router';
import { HTTP_OK } from '~/lib/httpcodes';
import type { MQCFGATEWAYMessage } from '~/lib/MQCFGATEWAY';
import MQIn from './mq/mqin/MQIn';
import MQErr from './mq/mqerr/MQErr';
import MQProc from './mq/mqproc/MQProc';
import MQOut from './mq/mqout/MQOut';
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
	
	// TODO Fazer um sched - Deletar arquivos muito velhos await env.CFGATEWAY.delete(body.filename);
	
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
					
					await MQStore(rawmsg, env);
					
				} else if (msg.type === 'process') {
					
					await MQProc(rawmsg, env);
					
				} else if (msg.type === 'out') {
					
					await MQOut(rawmsg, env);
					
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