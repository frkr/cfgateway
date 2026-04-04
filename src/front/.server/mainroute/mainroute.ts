//region Imports
import type { Route } from "../../routes/+types/mainroute";
import type { MQCFGATEWAYMessage } from '../../lib/MQCFGATEWAY';
import { HTTP_CREATED, HTTP_UNPROCESSABLE_ENTITY } from "../../lib/httpcodes";
import randomHEX from "../../lib/randomHEX";
import isEmpty from '../../lib/isEmpty';
import mqfilename from '../../lib/mqfilename';
//endregion

// Essa função esta perfeita e não deve ser alterada sem permissao do usuário
async function handleRequest(request: Request, env: Env) {
	try {
		const content = await request.text();

		if (!isEmpty(content) && content.length > 10) {
			const agora = new Date();
			const nextId = await randomHEX();
			const fname = mqfilename(agora, nextId);

			await env.CFGATEWAY.put(fname, content);

			await env.MQCFGATEWAY.send({
				id: nextId,
				url: request.url,
				filename:fname,
				type: "in",
				time: agora.getTime(),
			} as MQCFGATEWAYMessage, {
				contentType: "json",
			});
		} else {
			throw new Error("Content is empty or too short.");
		}

		return HTTP_CREATED();
	} catch (e) {
		console.warn("Request",request.method, e);
		// The Fake Promise for 5 seconds exists for delaying response for possible attacks.
		await new Promise((resolve) => setTimeout(resolve, 5000));
		return HTTP_UNPROCESSABLE_ENTITY();
	}
}

export async function loader({ request, context }: Route.LoaderArgs) {
	return handleRequest(request, context.cloudflare.env);
}

export async function action({ request, context }: Route.ActionArgs) {
	return handleRequest(request, context.cloudflare.env);
}
