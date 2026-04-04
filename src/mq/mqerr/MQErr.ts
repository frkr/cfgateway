import MQStore from '../mqstore/MQStore';

export default async function (rawmsg: Message<unknown>, env: Env) {
	
	await MQStore(rawmsg,env,"error");
	
}