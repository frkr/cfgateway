import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/worker";

describe("Hello World worker", () => {
	it("responds with 201 Created (unit style)", async () => {
		const request = new Request("http://example.com", {
			method: "POST",
			body: "test content that is long enough",
		});
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(201);
	});

	it("responds with 201 Created (integration style)", async () => {
		const response = await SELF.fetch("https://example.com", {
			method: "POST",
			body: "test content that is long enough",
		});
		expect(response.status).toBe(201);
	});
});
