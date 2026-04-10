import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { action } from '../src/front/.server/mainroute/mainroute';

describe('mainroute - SSRF validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createRequest = (url: string, method: string, body: string, headers?: Record<string, string>) => {
        const reqHeaders = new Headers();
        if (headers) {
            for (const [k, v] of Object.entries(headers)) {
                reqHeaders.set(k, v);
            }
        }
        return new Request(url, {
            method,
            body: method !== 'GET' ? body : undefined,
            headers: reqHeaders
        });
    };

    const createContext = () => ({
        cloudflare: {
            env: {
                ...env,
                ADMIN_TOKEN: 'valid_token_123'
            }
        }
    } as any);

    it('should allow valid public URL for /async', async () => {
        const payload = JSON.stringify({
            destiny: 'https://example.com/api',
            content: 'hello'
        });
        const req = createRequest('http://localhost/async/123', 'POST', payload);
        const ctx = createContext();

        const res = await action({ request: req, context: ctx, params: {} } as any);
        expect(res.status).toBe(201);
    });

    it('should reject localhost destiny without valid auth for /async', async () => {
        const payload = JSON.stringify({
            destiny: 'http://localhost:8080/internal',
            content: 'hello'
        });
        const req = createRequest('http://localhost/async/123', 'POST', payload);
        const ctx = createContext();

        const res = await action({ request: req, context: ctx, params: {} } as any);
        expect(res.status).toBe(422);
    });

    it('should reject .local destiny without valid auth for /async', async () => {
        const payload = JSON.stringify({
            destiny: 'http://my-service.local/api',
            content: 'hello'
        });
        const req = createRequest('http://localhost/async/123', 'POST', payload);
        const ctx = createContext();

        const res = await action({ request: req, context: ctx, params: {} } as any);
        expect(res.status).toBe(422);
    });

    it('should allow localhost destiny WITH valid auth for /async', async () => {
        const payload = JSON.stringify({
            destiny: 'http://localhost:8080/internal',
            content: 'hello'
        });
        const req = createRequest('http://localhost/async/123', 'POST', payload, {
            'Authorization': 'Bearer valid_token_123'
        });
        const ctx = createContext();

        const res = await action({ request: req, context: ctx, params: {} } as any);
        expect(res.status).toBe(201);
    });

    it('should reject localhost callback without valid auth for /async', async () => {
        const payload = JSON.stringify({
            destiny: 'https://example.com/api',
            callback: 'http://127.0.0.1/notify',
            content: 'hello'
        });
        const req = createRequest('http://localhost/async/123', 'POST', payload);
        const ctx = createContext();

        const res = await action({ request: req, context: ctx, params: {} } as any);
        expect(res.status).toBe(422);
    });

    it('should reject 127.0.0.2 destiny without valid auth for /async', async () => {
        const payload = JSON.stringify({
            destiny: 'http://127.0.0.2:8080/internal',
            content: 'hello'
        });
        const req = createRequest('http://localhost/async/123', 'POST', payload);
        const ctx = createContext();

        const res = await action({ request: req, context: ctx, params: {} } as any);
        expect(res.status).toBe(422);
    });

    it('should reject 0.0.0.0 destiny without valid auth for /async', async () => {
        const payload = JSON.stringify({
            destiny: 'http://0.0.0.0/internal',
            content: 'hello'
        });
        const req = createRequest('http://localhost/async/123', 'POST', payload);
        const ctx = createContext();

        const res = await action({ request: req, context: ctx, params: {} } as any);
        expect(res.status).toBe(422);
    });
});
