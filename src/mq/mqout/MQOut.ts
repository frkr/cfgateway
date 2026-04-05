import type { MQCFGATEWAYMessage } from '~/lib/MQCFGATEWAY';
import MQStore from '../mqstore/MQStore';

export default async function (rawmsg: Message<unknown>, env: Env) {
	
	await MQStore(rawmsg,env,"out");
	try {
	  await env.CFGATEWAY.delete((rawmsg.body as MQCFGATEWAYMessage) .filename);
	} catch (e) {
		console.error("EOL error:", e);
	}
	
}