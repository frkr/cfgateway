import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import MQProc from '../../../src/mq/MQProc';
import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import database from '../../../src/mq/database.json';

describe('MQProc', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
		// Ensure table exists
		await env.DB.prepare(database.createTable).run();
		// Clean table
		await env.DB.prepare('DELETE FROM messages').run();
	});
	
	it('should process /async message correctly with destiny and callback', async () => {
		const asyncMsg: MQCFGATEWAYMessageAsync & MQCFGATEWAYMessage = {
			id: 'test-parent-id',
			url: 'http://gateway/async',
			filename: '20244412000-test-id.txt',
			time: Date.now(),
			type: 'process',
			destiny: 'http://destiny.com',
			content: 'payload',
			callback: 'http://callback.com',
			method: 'POST',
			contentType: 'application/json'
		};
		
		const rawmsg = {
			body: asyncMsg,
			attempts: 1,
			retry: vi.fn(),
			ack: vi.fn()
		} as any;
		
		// Mock destiny response
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: () => Promise.resolve('destiny response'),
			headers: new Headers({ 'Content-Type': 'application/json' })
		});
		
		// Mock callback response
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: () => Promise.resolve('callback response'),
			headers: new Headers()
		});
		
		await MQProc(rawmsg, env);
		
		// Verify destiny fetch
		expect(global.fetch).toHaveBeenCalledWith('http://destiny.com', expect.objectContaining({
			method: 'POST',
			body: 'payload'
		}));
		
		// Verify callback fetch
		expect(global.fetch).toHaveBeenCalledWith('http://callback.com', expect.objectContaining({
			method: 'POST',
			body: 'destiny response'
		}));
		
		// Verify D1 records
		const { results } = await env.DB.prepare('SELECT * FROM messages').all();
		// Results should be 2: destiny response and callback response
		expect(results.length).toBe(2);
		
		const destinyRecord = results.find((r: any) => r.url === 'http://destiny.com');
		expect(destinyRecord).toBeDefined();
		expect(destinyRecord?.content).toBe('destiny response');
		expect(destinyRecord?.id_parent).toBe('test-parent-id');
		
		const callbackRecord = results.find((r: any) => r.url === 'http://callback.com');
		expect(callbackRecord).toBeDefined();
		expect(callbackRecord?.content).toBe('callback response');
		expect(callbackRecord?.id_parent).toBe('test-parent-id');
	});
	
	it('should trigger retry on fetch failure', async () => {
		const asyncMsg: MQCFGATEWAYMessageAsync & MQCFGATEWAYMessage = {
			id: 'test-id',
			url: 'http://gateway/async',
			filename: '20244412000-test-id.txt',
			time: Date.now(),
			type: 'process',
			destiny: 'http://destiny.com'
		};
		
		const rawmsg = {
			body: asyncMsg,
			attempts: 1,
			retry: vi.fn(),
			ack: vi.fn()
		} as any;
		
		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 500
		});
		
		await MQProc(rawmsg, env);
		
		expect(rawmsg.retry).toHaveBeenCalledWith({ delaySeconds: 10 });
	});
});
