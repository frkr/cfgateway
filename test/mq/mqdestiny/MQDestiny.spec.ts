import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import MQDestiny from '../../../src/mq/MQDestiny';
import type { MQCFGATEWAYMessage, MQCFGATEWAYMessageAsync } from '@/MQCFGATEWAY';
import database from '../../../src/mq/database.json';

describe('MQDestiny', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
		// Ensure table exists
		await env.DB.prepare(database.createTable).run();
		// Clean table
		await env.DB.prepare('DELETE FROM messages').run();
	});

	it('should process destiny and callback correctly', async () => {
        const mockR2Text = JSON.stringify({
            destiny: 'http://destiny.com/api',
			content: 'request payload',
			callback: 'http://callback.com/webhook',
			method: 'PUT',
			contentType: 'application/json',
            headers: { 'X-Custom-Header': 'Value' }
        });

		const rawmsg = {
			body: {
                id: 'test-id',
                url: 'http://gateway/async',
                filename: '2024-input-file.json',
                time: Date.now(),
                type: 'in',
                lab: true
            } as MQCFGATEWAYMessage,
			attempts: 1,
			retry: vi.fn(),
			ack: vi.fn()
		} as any;

        await env.CFGATEWAY.put('2024-input-file.json', mockR2Text);

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: () => Promise.resolve('destiny response data'),
		});

		await MQDestiny(rawmsg, env);

		expect(global.fetch).toHaveBeenCalledWith('http://destiny.com/api', expect.objectContaining({
			method: 'PUT',
			body: 'request payload'
		}));

        const fetchArgs = (global.fetch as any).mock.calls[0];
        const fetchHeaders = fetchArgs[1].headers;
        expect(fetchHeaders.get('X-Custom-Header')).toBe('Value');
        expect(fetchHeaders.get('Content-Type')).toBe('application/json');
	});

    it('should process destiny correctly without callback', async () => {
        const mockR2Text = JSON.stringify({
            destiny: 'http://destiny.com/api',
			content: 'request payload',
			method: 'POST'
        });

		const rawmsg = {
			body: {
                id: 'test-id-no-cb',
                url: 'http://gateway/async',
                filename: '2024-input-no-cb.json',
                time: Date.now(),
                type: 'in',
                lab: false
            } as MQCFGATEWAYMessage,
			attempts: 1,
			retry: vi.fn(),
			ack: vi.fn()
		} as any;

        await env.CFGATEWAY.put('2024-input-no-cb.json', mockR2Text);

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: () => Promise.resolve('destiny response data'),
		});

		await MQDestiny(rawmsg, env);

		expect(global.fetch).toHaveBeenCalledWith('http://destiny.com/api', expect.objectContaining({
			method: 'POST',
			body: 'request payload'
		}));
	});

    it('should mark as lost if no destiny is provided', async () => {
        const mockR2Text = JSON.stringify({
			content: 'request payload',
			method: 'POST'
        });

		const rawmsg = {
			body: {
                id: 'test-id-no-dest',
                url: 'http://gateway/async',
                filename: '2024-input-no-dest.json',
                time: Date.now(),
                type: 'in',
                lab: false
            } as MQCFGATEWAYMessage,
			attempts: 1,
			retry: vi.fn(),
			ack: vi.fn()
		} as any;

        await env.CFGATEWAY.put('2024-input-no-dest.json', mockR2Text);

		await MQDestiny(rawmsg, env);

        // It should call MQStore with 'lost'
        // According to database.json, column name is `status`
        const { results } = await env.DB.prepare('SELECT * FROM messages WHERE status = ?').bind('lost').all();
        expect(results.length).toBe(1);
        expect(results[0].id_parent).toBe('test-id-no-dest');
	});

    it('should retry if fetch fails and attempts <= 5', async () => {
        const mockR2Text = JSON.stringify({
            destiny: 'http://destiny.com/api',
			content: 'request payload'
        });

		const rawmsg = {
			body: {
                id: 'test-id-retry',
                filename: '2024-input-retry.json',
            } as MQCFGATEWAYMessage,
			attempts: 3,
			retry: vi.fn(),
			ack: vi.fn()
		} as any;

        await env.CFGATEWAY.put('2024-input-retry.json', mockR2Text);

		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 500
		});

        await expect(MQDestiny(rawmsg, env)).rejects.toThrow('Retrying...');

		expect(rawmsg.retry).toHaveBeenCalledWith({ delaySeconds: 10 });
	});

    it('should throw error and go to DLQ if fetch fails and attempts > 5', async () => {
        const mockR2Text = JSON.stringify({
            destiny: 'http://destiny.com/api',
			content: 'request payload'
        });

		const rawmsg = {
			body: {
                id: 'test-id-dlq',
                filename: '2024-input-dlq.json',
            } as MQCFGATEWAYMessage,
			attempts: 6,
			retry: vi.fn(),
			ack: vi.fn()
		} as any;

        await env.CFGATEWAY.put('2024-input-dlq.json', mockR2Text);

		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 500
		});

        await expect(MQDestiny(rawmsg, env)).rejects.toThrow('Fetch failed with status 500');

		expect(rawmsg.retry).not.toHaveBeenCalled();
	});

});
