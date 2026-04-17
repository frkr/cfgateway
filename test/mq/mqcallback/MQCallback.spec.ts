import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
import MQCallback from '../../../src/mq/MQCallback';
import database from '../../../src/mq/database.json';

describe('MQCallback', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
		await env.DB.prepare(database.createTable).run();
		await env.DB.prepare('DELETE FROM messages').run();
	});
	
	it('should store the message as lost after retry limit is exceeded', async () => {
		await env.CFGATEWAY.put('callback-test.txt', JSON.stringify({
			callback: 'http://callback.example.com',
			content: 'payload'
		}));
		
		const rawmsg = {
			body: {
				id: 'callback-parent-id',
				url: 'http://callback.example.com',
				filename: 'callback-test.txt',
				time: Date.now(),
				type: 'callback'
			},
			attempts: 6,
			retry: vi.fn(),
			ack: vi.fn()
		} as any;
		
		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 500
		});
		
		await MQCallback(rawmsg, env);
		
		const stored = await env.DB.prepare('SELECT status, url FROM messages WHERE id_parent = ?')
			.bind('callback-parent-id')
			.first<{ status: string; url: string }>();
		
		expect(stored?.status).toBe('error');
		expect(stored?.url).toBe('http://callback.example.com');
		expect(rawmsg.retry).not.toHaveBeenCalled();
	});
});
