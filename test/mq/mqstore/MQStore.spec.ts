import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from 'cloudflare:test';
import MQStore from '../../../src/mq/MQStore';
import type { MQCFGATEWAYMessage } from '@/MQCFGATEWAY';
import database from '../../../src/mq/database.json';

// Notice we do NOT mock randomHEX so we can test the real function and verify it returned a string
describe('MQStore', () => {
	let consoleErrorSpy: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Ensure table exists
		await env.DB.prepare(database.createTable).run();
		// Clean table
		await env.DB.prepare('DELETE FROM messages').run();

		// Mock console.error to avoid cluttering test output when testing errors
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should process and store message correctly reading from R2', async () => {
		const msg: MQCFGATEWAYMessage = {
			id: 'test-msg-id',
			url: 'http://test.url',
			filename: 'test-file.txt',
			time: 1234567890,
			type: 'in',
			lab: true
		};

		const rawmsg = { body: msg } as any;

		// Pre-populate mock R2 bucket
		await env.CFGATEWAY.put('test-file.txt', 'test content');

		await MQStore(rawmsg, env);

		const { results } = await env.DB.prepare('SELECT * FROM messages').all();
		expect(results.length).toBe(1);

		const record = results[0] as any;
		expect(typeof record.id).toBe('string');
		expect(record.id.length).toBeGreaterThan(0); // Ensure an ID was generated
		expect(record.id_parent).toBe('test-msg-id');
		expect(record.url).toBe('http://test.url');
		expect(record.filename).toBe('test-file.txt');
		expect(record.content).toBe('test content');
		expect(record.processed_at).toBe(1234567890);
		expect(record.status).toBe('in');
		expect(record.lab).toBe(1);
	});

	it('should not read from R2 if notread prop is true', async () => {
		const msg: MQCFGATEWAYMessage = {
			id: 'test-msg-id-2',
			url: null as any,
			filename: 'test-file-2.txt',
			time: 1234567890,
			type: 'out'
		};

		const rawmsg = { body: msg } as any;
		await env.CFGATEWAY.put('test-file-2.txt', 'test content');

		await MQStore(rawmsg, env, { notread: true });

		const { results } = await env.DB.prepare('SELECT * FROM messages').all();
		expect(results.length).toBe(1);
		const record = results[0] as any;
		expect(record.content).toBeNull();
		expect(record.status).toBe('out');
	});

	it('should not read from R2 if filename is missing', async () => {
		const msg: MQCFGATEWAYMessage = {
			id: 'test-msg-id-3',
			url: 'http://test.url',
			filename: '', // Passed as empty string to bypass NOT NULL check on DB while skipping R2 logic
			time: 1234567890,
			type: 'error'
		};

		const rawmsg = { body: msg } as any;

		await MQStore(rawmsg, env);

		const { results } = await env.DB.prepare('SELECT * FROM messages').all();
		expect(results.length).toBe(1);
		const record = results[0] as any;
		expect(record.content).toBeNull();
	});

	it('should handle R2 errors gracefully and insert with null content', async () => {
		const msg: MQCFGATEWAYMessage = {
			id: 'test-msg-id-4',
			url: 'http://test.url',
			filename: 'non-existent-file.txt',
			time: 1234567890,
			type: 'in'
		};

		const rawmsg = { body: msg } as any;

		// Intentionally throwing an error from env.CFGATEWAY.get to simulate R2 failure
		const originalGet = env.CFGATEWAY.get;
		env.CFGATEWAY.get = vi.fn().mockRejectedValueOnce(new Error('R2 Bucket Error'));

		await MQStore(rawmsg, env);

		expect(consoleErrorSpy).toHaveBeenCalledWith('Error reading file from R2:', expect.any(Error));

		const { results } = await env.DB.prepare('SELECT * FROM messages').all();
		expect(results.length).toBe(1);
		const record = results[0] as any;
		expect(record.content).toBeNull();

		// Restore original behavior
		env.CFGATEWAY.get = originalGet;
	});

	it('should use Date.now() when resettime prop is true', async () => {
		const msg: MQCFGATEWAYMessage = {
			id: 'test-msg-id-5',
			url: 'http://test.url',
			filename: 'test-file.txt',
			time: 1000000000,
			type: 'in'
		};

		const rawmsg = { body: msg } as any;

		const mockNow = 1712750000000;
		const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValueOnce(mockNow);

		await MQStore(rawmsg, env, { resettime: true });

		const { results } = await env.DB.prepare('SELECT * FROM messages').all();
		expect(results.length).toBe(1);
		const record = results[0] as any;
		expect(record.processed_at).toBe(mockNow);
	});

	it('should use props.type instead of msg.type if provided', async () => {
		const msg: MQCFGATEWAYMessage = {
			id: 'test-msg-id-6',
			url: 'http://test.url',
			filename: 'test-file.txt',
			time: 1234567890,
			type: 'in'
		};

		const rawmsg = { body: msg } as any;

		await MQStore(rawmsg, env, { type: 'store' });

		const { results } = await env.DB.prepare('SELECT * FROM messages').all();
		expect(results.length).toBe(1);
		const record = results[0] as any;
		expect(record.status).toBe('store');
	});

	it('should map falsy lab to 0', async () => {
		const msg: MQCFGATEWAYMessage = {
			id: 'test-msg-id-7',
			url: 'http://test.url',
			filename: 'test-file.txt',
			time: 1234567890,
			type: 'in',
			lab: false
		};

		const rawmsg = { body: msg } as any;

		await MQStore(rawmsg, env);

		const { results } = await env.DB.prepare('SELECT * FROM messages').all();
		expect(results.length).toBe(1);
		const record = results[0] as any;
		expect(record.lab).toBe(0);
	});
});
