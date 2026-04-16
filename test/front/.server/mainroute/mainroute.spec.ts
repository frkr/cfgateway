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
	
	it("accepts public dynamic paths without authorization", async () => {
		const mockEnv = {
			...env,
			CFGATEWAY: {
				put: vi.fn().mockResolvedValue(null)
			},
			MQCFGATEWAY: {
				send: vi.fn().mockResolvedValue(undefined)
			}
		};
		const request = new Request("http://example.com/davi", {
			method: "POST",
			body: "test content that is long enough",
		});
		const context = {
			cloudflare: {
				env: mockEnv
			}
		};
		
		const response = await action({ request, context } as any);
		
		expect(response.status).toBe(201);
		expect(mockEnv.CFGATEWAY.put).toHaveBeenCalledOnce();
		expect(mockEnv.MQCFGATEWAY.send).toHaveBeenCalledOnce();
		expect(mockEnv.MQCFGATEWAY.send).toHaveBeenCalledWith(expect.objectContaining({
			url: "http://example.com/davi",
			type: "in"
		}), expect.objectContaining({
			contentType: "json"
		}));
	});
	
	it("keeps /async protected by the admin token", async () => {
		const mockEnv = {
			...env,
			ADMIN_TOKEN: "supersecret",
			CFGATEWAY: {
				put: vi.fn().mockResolvedValue(null)
			},
			MQCFGATEWAY: {
				send: vi.fn().mockResolvedValue(undefined)
			}
		};
		const request = new Request("http://example.com/async", {
			method: "POST",
			body: "test content that is long enough",
		});
		const context = {
			cloudflare: {
				env: mockEnv
			}
		};
		
		const responsePromise = action({ request, context } as any);
		await vi.runAllTimersAsync();
		const response = await responsePromise;
		
		expect(response.status).toBe(422);
		expect(mockEnv.CFGATEWAY.put).not.toHaveBeenCalled();
		expect(mockEnv.MQCFGATEWAY.send).not.toHaveBeenCalled();
	});
});