import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import mqfilename from '@/mqfilename';
import randomHEX from '@/randomHEX';
import MQStore from './MQStore';
import MQDestiny from './MQDestiny';

export default async function(rawmsg: Message<unknown>, env: Env) {
	
	let msg = rawmsg.body as MQCFGATEWAYMessage;
	
	let path: string | null = null;
	try {
		path = msg.url ? new URL(msg.url).pathname : null;
	} catch (e) {
	}
	
	if (path?.startsWith('/store')) {
		
		// Noop
		
	} else if (path?.startsWith('/async')) {
		
		await MQDestiny(rawmsg, env);
		
	} else {
		
		await MQStore(rawmsg, env, {
			type: 'lost',
			resettime: true
		});
		
	}
	
}