import { env } from "cloudflare:test";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { action } from "../../../../src/front/.server/mainroute/mainroute";
import pathrouteDatabase from "../../../../src/front/lib/pathroute.database.json";

describe("mainroute sync", () => {
	beforeEach(async () => {
		vi.useFakeTimers();
		global.fetch = vi.fn();
		await env.DB.prepare(pathrouteDatabase.createTable).run();
		await env.DB.prepare('DELETE FROM paths').run();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("responds synchronously when path starts with /sync/", async () => {
		const mockEnv = {
			...env,
			CFGATEWAY: {
				put: vi.fn().mockResolvedValue(null)
			},
			MQCFGATEWAY: {
				send: vi.fn().mockResolvedValue(undefined)
			}
		};
		const mockCtx = {
			waitUntil: vi.fn()
		};

		// Insert a path route for 'davi'
		await env.DB.prepare(pathrouteDatabase.insert)
			.bind(
				'path-sync-1',
				'davi',
				'https://destiny.com/api',
				'https://callback.com/api', // callback
				'POST',
				'POST',
				'application/json',
				'', // contentTypeCallback
				null, // headersDestiny
				null, // headersCallback
				1, // enabled
				1, // is_async (even if is_async=1, /sync/ prefix should force sync)
				Date.now(),
				Date.now()
			)
			.run();

		// Mock destiny response
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: () => Promise.resolve('{"success":true}'),
			headers: new Headers({ 'Content-Type': 'application/json' })
		});

		const request = new Request("http://example.com/sync/davi", {
			method: "POST",
			body: "test content that is long enough",
		});
		const context = {
			cloudflare: {
				env: mockEnv,
				ctx: mockCtx
			}
		};

		const response = await action({ request, context } as any);

		expect(response.status).toBe(200);
		const body = await response.text();
		expect(body).toBe('{"success":true}');
		expect(response.headers.get('Content-Type')).toBe('application/json');

		// Verify that logs were scheduled via waitUntil
		expect(mockCtx.waitUntil).toHaveBeenCalled();

		// Run all microtasks to allow background work to proceed if awaited
		await Promise.allSettled(mockCtx.waitUntil.mock.calls.map(call => call[0]));

		// 3 files should have been put: 1 IN, 1 OUT, 1 CALLBACK
		expect(mockEnv.CFGATEWAY.put).toHaveBeenCalledTimes(3);
		// 3 queue messages should have been sent: 1 IN (store), 1 OUT, 1 CALLBACK
		expect(mockEnv.MQCFGATEWAY.send).toHaveBeenCalledTimes(3);
	});

	it("responds synchronously when is_async is 0 in database", async () => {
		const mockEnv = {
			...env,
			CFGATEWAY: {
				put: vi.fn().mockResolvedValue(null)
			},
			MQCFGATEWAY: {
				send: vi.fn().mockResolvedValue(undefined)
			}
		};
		const mockCtx = {
			waitUntil: vi.fn()
		};

		// Insert a path route for 'davi' with is_async = 0
		await env.DB.prepare(pathrouteDatabase.insert)
			.bind(
				'path-sync-2',
				'davi-sync',
				'https://destiny.com/api-sync',
				'',
				'POST',
				'POST',
				'application/json',
				'',
				null,
				null,
				1,
				0, // is_async = 0 (Sync)
				Date.now(),
				Date.now()
			)
			.run();

		// Mock destiny response
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 201,
			text: () => Promise.resolve('Created Sync'),
			headers: new Headers({ 'Content-Type': 'text/plain' })
		});

		const request = new Request("http://example.com/davi-sync", {
			method: "POST",
			body: "test content that is long enough",
		});
		const context = {
			cloudflare: {
				env: mockEnv,
				ctx: mockCtx
			}
		};

		const response = await action({ request, context } as any);

		expect(response.status).toBe(201);
		const body = await response.text();
		expect(body).toBe('Created Sync');
		expect(response.headers.get('Content-Type')).toBe('text/plain');
	});
});
