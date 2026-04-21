import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { action, loader } from '../../../../src/front/.server/panel/paths';
import database from '../../../../src/front/lib/pathroute.database.json';
import type { PathRoute } from '../../../../src/front/lib/pathroute';

describe('Panel Path Routes - Loader', () => {
	beforeEach(async () => {
		await env.DB.prepare(database.createTable).run();
		await env.DB.prepare('DELETE FROM paths').run();
	});
	
	it('should require authentication on the HTML request', async () => {
		const request = new Request('http://example.com/panel/paths');
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret'
				}
			}
		} as any;
		
		const data = await loader({ request, context, params: {} } as any);
		
		expect(data).toHaveProperty('requireAuth', true);
	});
	
	it('should return 401 on JSON requests with invalid token', async () => {
		const request = new Request('http://example.com/panel/paths?json=1', {
			headers: {
				Authorization: 'Bearer badtoken'
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
		
		const response = await loader({ request, context, params: {} } as any);
		
		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(401);
	});
});

describe('Panel Path Routes - Action', () => {
	beforeEach(async () => {
		await env.DB.prepare(database.createTable).run();
		await env.DB.prepare('DELETE FROM paths').run();
	});
	
	it('should create and update a path route', async () => {
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret'
				}
			}
		} as any;
		
		const createRequest = new Request('http://example.com/panel/paths?json=1', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer supersecret'
			},
			body: JSON.stringify({
				intent: 'save',
				route: {
					path: '/davi/',
					destiny: 'https://destiny.example.com/hook',
					callback: '',
					methodDestiny: 'post',
					methodCallback: 'patch',
					contentTypeDestiny: 'application/json',
					contentTypeCallback: 'text/plain',
					headersDestiny: [
						{ key: 'Authorization', value: 'Bearer token' }
					],
					headersCallback: [
						{ key: 'X-Callback', value: 'ok' }
					],
					enabled: true
				}
			})
		});
		
		const createResponse = await action({ request: createRequest, context, params: {} } as any);
		const createData = await (createResponse as Response).json() as { success: boolean; routes: PathRoute[] };
		
		expect(createData.success).toBe(true);
		expect(createData.routes).toHaveLength(1);
		expect(createData.routes[0].path).toBe('davi');
		expect(createData.routes[0].methodDestiny).toBe('POST');
		expect(createData.routes[0].methodCallback).toBe('PATCH');
		expect(createData.routes[0].contentTypeDestiny).toBe('application/json');
		expect(createData.routes[0].headersDestiny).toEqual([
			{ key: 'Authorization', value: 'Bearer token' }
		]);
		
		const updateRequest = new Request('http://example.com/panel/paths?json=1', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer supersecret'
			},
			body: JSON.stringify({
				intent: 'save',
				id: createData.routes[0].id,
				route: {
					path: 'davi',
					destiny: 'https://destiny.example.com/changed',
					callback: 'https://callback.example.com/hook',
					methodDestiny: 'PATCH',
					methodCallback: 'PUT',
					contentTypeDestiny: 'application/xml',
					contentTypeCallback: 'application/json',
					headersDestiny: [
						{ key: 'X-Updated', value: 'yes' }
					],
					headersCallback: [
						{ key: 'X-Callback', value: 'updated' }
					],
					enabled: false
				}
			})
		});
		
		const updateResponse = await action({ request: updateRequest, context, params: {} } as any);
		const updateData = await (updateResponse as Response).json() as { success: boolean; routes: PathRoute[] };
		
		expect(updateData.success).toBe(true);
		expect(updateData.routes[0].destiny).toBe('https://destiny.example.com/changed');
		expect(updateData.routes[0].callback).toBe('https://callback.example.com/hook');
		expect(updateData.routes[0].methodDestiny).toBe('PATCH');
		expect(updateData.routes[0].methodCallback).toBe('PUT');
		expect(updateData.routes[0].headersCallback).toEqual([
			{ key: 'X-Callback', value: 'updated' }
		]);
		expect(updateData.routes[0].enabled).toBe(false);
	});
	
	it('should delete a path route', async () => {
		await env.DB.prepare(database.insert)
			.bind('path-1', 'davi', 'https://destiny.example.com/hook', null, 'POST', 'POST', null, null, null, null, 1, 1, Date.now(), Date.now())
			.run();
		
		const request = new Request('http://example.com/panel/paths?json=1', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer supersecret'
			},
			body: JSON.stringify({
				intent: 'delete',
				id: 'path-1'
			})
		});
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret'
				}
			}
		} as any;
		
		const response = await action({ request, context, params: {} } as any);
		const data = await (response as Response).json() as { success: boolean; routes: PathRoute[] };
		
		expect(data.success).toBe(true);
		expect(data.routes).toHaveLength(0);
	});
	
	it('should read old path records without async extension columns filled', async () => {
		const now = Date.now();
		await env.DB.prepare('INSERT INTO paths (id, path, destiny, method_destiny, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
			.bind('legacy-1', 'legacy', 'https://destiny.example.com/legacy', 'POST', 1, now, now)
			.run();
		
		const request = new Request('http://example.com/panel/paths?json=1', {
			headers: {
				Authorization: 'Bearer supersecret'
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
		
		const response = await loader({ request, context, params: {} } as any);
		const data = await (response as Response).json() as { routes: PathRoute[] };
		
		expect(data.routes).toHaveLength(1);
		expect(data.routes[0].callback).toBe('');
		expect(data.routes[0].headersDestiny).toEqual([]);
		expect(data.routes[0].headersCallback).toEqual([]);
	});
});
