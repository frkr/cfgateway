import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import MQProc from '../../../src/mq/MQProc';
import MQCallback from '../../../src/mq/MQCallback';
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
		
		// Put message content in R2
		await env.CFGATEWAY.put(asyncMsg.filename, JSON.stringify(asyncMsg));

		// Mock destiny response
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: () => Promise.resolve('destiny response'),
			headers: new Headers({ 'Content-Type': 'application/json' })
		});
		
		// 1. Run MQProc (which calls MQDestiny)
		await MQProc(rawmsg, env);

		// Verify destiny fetch
		expect(global.fetch).toHaveBeenCalledWith('http://destiny.com', expect.objectContaining({
			method: 'POST',
			body: 'payload'
		}));

		// 2. Simulate what the worker queue handler does when it receives the 'callback' message
		// We need to find the filename that was generated for the destiny response
		const r2Objects = await env.CFGATEWAY.list();
		const destinyResponseFile = r2Objects.objects.find(obj => obj.key !== asyncMsg.filename);
		expect(destinyResponseFile).toBeDefined();

		const callbackMsg: MQCFGATEWAYMessage = {
			id: 'test-parent-id',
			url: 'http://callback.com',
			filename: destinyResponseFile!.key,
			time: Date.now(),
			type: 'callback'
		};

		const callbackRawMsg = {
			body: callbackMsg,
			attempts: 1,
			retry: vi.fn(),
			ack: vi.fn()
		} as any;

		// Mock callback response
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: () => Promise.resolve('callback response'),
			headers: new Headers()
		});
		
		await MQCallback(callbackRawMsg, env);
		
		// Verify callback fetch
		expect(global.fetch).toHaveBeenCalledWith('http://callback.com', expect.objectContaining({
			method: 'POST',
			body: 'destiny response'
		}));
		
		// 3. To verify D1 records, we need to run MQStore for the messages that were sent to the queue
		// In the real worker, MQStore is called for 'out' and 'internal' types.
		// MQDestiny sends an 'out' message.
		// MQCallback sends an 'internal' message.

		const outMsg = {
			id: 'test-parent-id',
			url: 'http://destiny.com',
			filename: destinyResponseFile!.key,
			time: Date.now(),
			type: 'out'
		};

		// Find the callback response filename
		const r2ObjectsAfterCallback = await env.CFGATEWAY.list();
		const callbackResponseFile = r2ObjectsAfterCallback.objects.find(obj => obj.key !== asyncMsg.filename && obj.key !== destinyResponseFile!.key);
		expect(callbackResponseFile).toBeDefined();

		const internalMsg = {
			id: 'test-parent-id',
			url: 'http://callback.com',
			filename: callbackResponseFile!.key,
			time: Date.now(),
			type: 'internal'
		};

		// We call MQStore directly to simulate the worker's behavior for these types
		const { default: MQStore } = await import('../../../src/mq/MQStore');
		await MQStore({ body: outMsg, ack: vi.fn() } as any, env, { type: 'callback' });
		await MQStore({ body: internalMsg, ack: vi.fn() } as any, env, { type: 'internal' });

		// Verify D1 records
		const { results } = await env.DB.prepare('SELECT * FROM messages').all();
		expect(results.length).toBe(2);
		
		const destinyRecord = results.find((r: any) => r.url === 'http://destiny.com');
		expect(destinyRecord).toBeDefined();
		// The content stored in R2 by MQDestiny is a JSON containing the destiny response text
		const destinyStoredContent = JSON.parse(destinyRecord?.content);
		expect(destinyStoredContent.content).toBe('destiny response');
		expect(destinyRecord?.id_parent).toBe('test-parent-id');
		
		const callbackRecord = results.find((r: any) => r.url === 'http://callback.com');
		expect(callbackRecord).toBeDefined();
		// Similar for callback response
		const callbackStoredContent = JSON.parse(callbackRecord?.content);
		expect(callbackStoredContent.content).toBe('callback response');
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
		
		// Put message content in R2
		await env.CFGATEWAY.put(asyncMsg.filename, JSON.stringify(asyncMsg));

		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 500
		});
		
		// We expect MQProc to throw when it calls rawmsg.retry() as implemented in MQDestiny.ts
		await expect(MQProc(rawmsg, env)).rejects.toThrow('Retrying...');
		
		expect(rawmsg.retry).toHaveBeenCalledWith({ delaySeconds: 10 });
	});
});
