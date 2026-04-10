import { describe, it, expect, beforeEach, vi } from "vitest";
import { loader, action } from '../../../../src/front/.server/panel/panel';
import { env } from 'cloudflare:test';
import database from '../../../../src/mq/database.json';
import type { Message } from '../../../../src/database';

describe('Panel Server Tests - Loader', () => {
	beforeEach(async () => {
		await env.DB.prepare(database.createTable).run();
		await env.DB.prepare('DELETE FROM messages').run();
	});

	it('should return 401 Unauthorized without token', async () => {
		const request = new Request('http://example.com/panel');
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

	it('should return 401 Unauthorized with invalid token in query string', async () => {
		const request = new Request('http://example.com/panel?token=badtoken');
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

	it('should return 401 Unauthorized with invalid token in Authorization header', async () => {
		const request = new Request('http://example.com/panel', {
			headers: {
				'Authorization': 'Bearer badtoken'
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

	it('should return 401 Unauthorized when ADMIN_TOKEN is not set in env', async () => {
		const request = new Request('http://example.com/panel?token=supersecret');
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: '' // Missing token in env
				}
			}
		} as any;

		const response = await loader({ request, context, params: {} });
		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(401);
	});

	it('should return successful JSON response with token in query string and Accept header', async () => {
		// Insert a dummy message to test return structure
		await env.DB.prepare(database.insert)
			.bind('msg-1', 'parent-1', 'http://example.com/url', 'file.txt', 'test content', Date.now(), 'processed', 0)
			.run();

		const request = new Request('http://example.com/panel?token=supersecret', {
			headers: {
				'Accept': 'application/json'
			}
		});
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret',
					VALUE_FROM_CLOUDFLARE: 'Hello from Tests'
				}
			}
		} as any;

		const response = await loader({ request, context, params: {} });
		expect(response).toBeInstanceOf(Response);

		const data = await (response as Response).json() as { message: string, messages: Message[] };
		expect(data.message).toBe('Hello from Tests');
		expect(data.messages).toBeInstanceOf(Array);
		expect(data.messages.length).toBe(1);
		expect(data.messages[0].id).toBe('msg-1');
	});

	it('should return successful JSON response with token in header and ?json param', async () => {
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

		const data = await (response as Response).json() as { message: string, messages: Message[] };
		expect(data.message).toBe('Test Data');
		expect(data.messages).toBeInstanceOf(Array);
		expect(data.messages.length).toBe(0); // Assuming table is empty
	});

	it('should return raw object when neither Accept JSON nor ?json is provided', async () => {
		const request = new Request('http://example.com/panel?token=supersecret');
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret',
					VALUE_FROM_CLOUDFLARE: 'Raw Return'
				}
			}
		} as any;

		const response = await loader({ request, context, params: {} });
		// It returns the raw object from the loader if not JSON
		expect(response).not.toBeInstanceOf(Response);

		const data = response as { message: string, messages: Message[] };
		expect(data.message).toBe('Raw Return');
		expect(data.messages).toBeInstanceOf(Array);
	});
});

describe('Panel Server Tests - Action', () => {
	beforeEach(async () => {
		await env.DB.prepare(database.createTable).run();
		await env.DB.prepare('DELETE FROM messages').run();
	});

	it('should return 401 Unauthorized without token', async () => {
		const request = new Request('http://example.com/panel', { method: 'POST' });
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
		// Mock the queue put/send so storeMessage works without failing
		let queueSent = false;
		const mockEnv = {
			...env,
			ADMIN_TOKEN: 'supersecret',
			CFGATEWAY: {
				put: vi.fn().mockResolvedValue(null)
			},
			MQCFGATEWAY: {
				send: vi.fn().mockImplementation(() => {
					queueSent = true;
					return Promise.resolve();
				})
			}
		};

		const messageToRetry = {
			content: 'retry me',
			url: 'http://example.com/target'
		};

		const request = new Request('http://example.com/panel?token=supersecret', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
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
		expect(queueSent).toBe(true);
	});

	it('should return 400 with success false on action error', async () => {
		// Send malformed JSON to trigger an error
		const request = new Request('http://example.com/panel?token=supersecret', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: '{"bad json"'
		});

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

		expect((response as Response).status).toBe(400);
		const data = await (response as Response).json() as { success: boolean, error: string };
		expect(data.success).toBe(false);
		expect(data.error).toBeDefined();
	});

	it('should fallback to loader if method is not POST', async () => {
		const request = new Request('http://example.com/panel?token=supersecret', {
			method: 'GET'
		});

		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret',
					VALUE_FROM_CLOUDFLARE: 'Fallback Loader'
				}
			}
		} as any;

		const response = await action({ request, context, params: {} });
		// GET requests pass through to loader, which returns a raw object by default
		expect(response).not.toBeInstanceOf(Response);

		const data = response as { message: string, messages: Message[] };
		expect(data.message).toBe('Fallback Loader');
	});
});
