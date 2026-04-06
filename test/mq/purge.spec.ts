import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../../src/worker';
import database from '../../src/mq/database.json';

describe('Worker Purge', () => {
	beforeEach(async () => {
		// Initialize the database schema
		await env.DB.prepare(database.createTable).run();
		// Clear the table
		await env.DB.prepare('DELETE FROM messages').run();
	});

	it('should delete messages older than 30 days and keep recent ones', async () => {
		const now = Date.now();
		const thirtyOneDaysAgo = now - (31 * 24 * 60 * 60 * 1000);
		const oneDayAgo = now - (1 * 24 * 60 * 60 * 1000);

		// Insert an old message
		await env.DB.prepare(database.insert)
			.bind('old-id', 'parent-id', 'http://example.com/old', 'old.txt', 'old content', thirtyOneDaysAgo, 'processed', 0)
			.run();

		// Insert a recent message
		await env.DB.prepare(database.insert)
			.bind('recent-id', 'parent-id', 'http://example.com/recent', 'recent.txt', 'recent content', oneDayAgo, 'processed', 0)
			.run();

		// Verify they both exist
		let count = await env.DB.prepare('SELECT COUNT(*) as count FROM messages').first('count');
		expect(count).toBe(2);

		// Trigger the scheduled handler
		const ctx = createExecutionContext();
		const event: ScheduledEvent = {
			cron: '',
			scheduledTime: now,
			noWait: () => {},
		};

		await worker.scheduled(event, env, ctx);
		await waitOnExecutionContext(ctx);

		// Verify only the recent message remains
		const messages: any[] = (await env.DB.prepare('SELECT id FROM messages').all()).results;
		expect(messages.length).toBe(1);
		expect(messages[0].id).toBe('recent-id');
	});
});
