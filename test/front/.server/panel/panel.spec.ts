import { describe, it, expect, beforeEach, vi } from "vitest";
import { loader, action } from '../../../../src/front/.server/panel/panel';
import { env } from 'cloudflare:test';
import database from '../../../../src/mq/database.json';
import type { Message } from '../../../../src/front/lib/database';

describe('Panel Server Tests - Loader', () => {
	beforeEach(async () => {
		await env.DB.prepare(database.createTable).run();
		await env.DB.prepare('DELETE FROM messages').run();
	});

	it('should return requireAuth true without token', async () => {
		const request = new Request('http://example.com/panel');
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret'
				}
			}
		} as any;

		const data = await loader({ request, context, params: {} });
		expect(data).toHaveProperty('requireAuth', true);
	});

	it('should return 401 Unauthorized with invalid token in Authorization header and JSON request', async () => {
		const request = new Request('http://example.com/panel', {
			headers: {
				'Authorization': 'Bearer badtoken',
				'Accept': 'application/json'
			}
		});
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret'
				}
			}
		} as any;

		const response = await loader({ request, context, params: {} });
		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(401);
	});

	it('should return successful JSON response with token in header and ?json param', async () => {
		const now = Date.now();
		await env.DB.prepare('INSERT INTO messages (id, id_parent, url, filename, content, processed_at, status, lab) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
			.bind('msg-1', 'parent-1', 'http://example.com/url', 'file.txt', 'test content', now, 'in', 0)
			.run();

		const request = new Request('http://example.com/panel?json=true', {
			headers: {
				'Authorization': 'Bearer supersecret'
			}
		});
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret',
					VALUE_FROM_CLOUDFLARE: 'Test Data'
				}
			}
		} as any;

		const response = await loader({ request, context, params: {} });
		expect(response).toBeInstanceOf(Response);

		const data = await (response as Response).json() as { message: string, messages: Message[], isGrouped: boolean };
		expect(data.message).toBe('Test Data');
		expect(data.messages).toBeInstanceOf(Array);
		expect(data.messages.length).toBe(1);
		expect(data.isGrouped).toBe(true);
		expect(data.messages[0].id_parent).toBe('parent-1');
		expect(data.messages[0].message_count).toBe(1);
	});

	it('should return messages for a specific parent', async () => {
		const now = Date.now();
		await env.DB.prepare('INSERT INTO messages (id, id_parent, url, filename, content, processed_at, status, lab) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
			.bind('msg-in', 'parent-1', 'http://example.com/url', 'file1.txt', 'in content', now, 'in', 0)
			.run();
		await env.DB.prepare('INSERT INTO messages (id, id_parent, url, filename, content, processed_at, status, lab) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
			.bind('msg-out', 'parent-1', '', 'file2.txt', 'out content', now + 1000, 'out', 0)
			.run();

		const request = new Request('http://example.com/panel/parent-1?json=true', {
			headers: {
				'Authorization': 'Bearer supersecret'
			}
		});
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret'
				}
			}
		} as any;

		const response = await loader({ request, context, params: { id_parent: 'parent-1' } });
		expect(response).toBeInstanceOf(Response);

		const data = await (response as Response).json() as { messages: Message[], isGrouped: boolean, id_parent: string };
		expect(data.isGrouped).toBe(false);
		expect(data.id_parent).toBe('parent-1');
		expect(data.messages.length).toBe(2);
		expect(data.messages[0].status).toBe('in');
		expect(data.messages[1].status).toBe('out');
		// URL should be populated from the 'in' message for both
		expect(data.messages[0].url).toBe('http://example.com/url');
		expect(data.messages[1].url).toBe('http://example.com/url');
	});
});

describe('Panel Server Tests - Action', () => {
	beforeEach(async () => {
		await env.DB.prepare(database.createTable).run();
		await env.DB.prepare('DELETE FROM messages').run();
	});

	it('should return 401 Unauthorized without token', async () => {
		const request = new Request('http://example.com/panel', { method: 'POST', body: JSON.stringify({ intent: 'retry' }) });
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret'
				}
			}
		} as any;

		const response = await action({ request, context, params: {} });
		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(401);
	});

	it('should process retry intent and return success true', async () => {
		const mockEnv = {
			...env,
			ADMIN_TOKEN: 'supersecret',
			CFGATEWAY: {
				put: vi.fn().mockResolvedValue(null)
			},
			MQCFGATEWAY: {
				send: vi.fn().mockResolvedValue(undefined)
			}
		};

		const messageToRetry = {
			content: 'retry me',
			url: 'http://example.com/target'
		};

		const request = new Request('http://example.com/panel', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer supersecret'
			},
			body: JSON.stringify({
				intent: 'retry',
				message: messageToRetry
			})
		});

		const context = {
			cloudflare: {
				env: mockEnv
			}
		} as any;

		const response = await action({ request, context, params: {} });
		expect(response).toBeInstanceOf(Response);

		const data = await (response as Response).json() as { success: boolean };
		expect(data.success).toBe(true);

		expect(mockEnv.CFGATEWAY.put).toHaveBeenCalled();
		expect(mockEnv.MQCFGATEWAY.send).toHaveBeenCalled();
	});
});
