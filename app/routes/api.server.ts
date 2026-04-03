import { HTTP_CREATED, HTTP_UNPROCESSABLE_ENTITY } from "../lib/httpcodes";
import randomHEX from "../lib/randomHEX";
import type { Route } from "./+types/api";
import { isEmpty } from '../lib/isEmpty';

async function handleRequest(request: Request, env: Env) {
	try {
		const content = await request.text();

		if (!isEmpty(content) && content.length > 10) {
			const agora = new Date();
			const nextId = await randomHEX();
			const filename = `${agora.getFullYear()}${agora.getMonth() + 1}${agora.getDate()}${agora.getHours()}${agora.getMinutes()}${agora.getSeconds()}-${nextId}.txt`;

			await env.CFGATEWAY.put(filename, content);

			await env.MQCFGATEWAY.send({
				id: nextId,
				url: request.url,
			}, {
				contentType: "json",
			});
		}

		return HTTP_CREATED();
	} catch (e) {
		console.error('FATAL', e);
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
