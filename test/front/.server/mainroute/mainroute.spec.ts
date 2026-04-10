import { env } from "cloudflare:test";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { action } from "../../../../src/front/.server/mainroute/mainroute";

describe("mainroute", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("responds with 422 Unprocessable Entity for empty or short content", async () => {
		const request = new Request("http://example.com", {
			method: "POST",
			body: "short",
		});

		const context = {
			cloudflare: {
				env: env
			}
		};

		// We need to capture the promise, then advance timers, then await
		const responsePromise = action({ request, context } as any);

		// Run all timers to bypass the 5-second delay
		await vi.runAllTimersAsync();

		const response = await responsePromise;

		expect(response.status).toBe(422);
	});
});