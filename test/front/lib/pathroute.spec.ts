import { describe, expect, it } from 'vitest';
import { isPathRouteMethod, normalizeMethodDestiny, toPathRoute, type PathRouteRow } from '../../../src/front/lib/pathroute';

describe('pathroute', () => {
	describe('normalizeMethodDestiny', () => {
		it('should convert strings to uppercase', () => {
			expect(normalizeMethodDestiny('get')).toBe('GET');
			expect(normalizeMethodDestiny('post')).toBe('POST');
			expect(normalizeMethodDestiny('Put')).toBe('PUT');
		});

		it('should trim whitespace from strings', () => {
			expect(normalizeMethodDestiny('  get  ')).toBe('GET');
			expect(normalizeMethodDestiny('\tpost\n')).toBe('POST');
		});
	});

	describe('isPathRouteMethod', () => {
		it('should return true for valid methods', () => {
			expect(isPathRouteMethod('GET')).toBe(true);
			expect(isPathRouteMethod('POST')).toBe(true);
			expect(isPathRouteMethod('PUT')).toBe(true);
			expect(isPathRouteMethod('PATCH')).toBe(true);
			expect(isPathRouteMethod('DELETE')).toBe(true);
		});

		it('should return false for invalid methods', () => {
			expect(isPathRouteMethod('OPTIONS')).toBe(false);
			expect(isPathRouteMethod('HEAD')).toBe(false);
			expect(isPathRouteMethod('INVALID')).toBe(false);
			expect(isPathRouteMethod('')).toBe(false);
		});

		it('should return false for lowercase methods (since they are not normalized)', () => {
			expect(isPathRouteMethod('get')).toBe(false);
			expect(isPathRouteMethod('post')).toBe(false);
		});
	});

	describe('toPathRoute', () => {
		const baseRow: PathRouteRow = {
			id: 'test-id',
			path: '/test-path',
			destiny: 'https://example.com',
			callback: null,
			method_destiny: 'POST',
			method_callback: null,
			content_type_destiny: null,
			content_type_callback: null,
			headers_destiny: null,
			headers_callback: null,
			enabled: 1,
			created_at: 1234567890,
			updated_at: 1234567890
		};

		it('should parse valid array of header entries', () => {
			const row = {
				...baseRow,
				headers_destiny: JSON.stringify([
					{ key: 'X-Test-1', value: 'value1' },
					{ key: 'X-Test-2', value: 'value2' }
				])
			};

			const result = toPathRoute(row);
			expect(result.headersDestiny).toEqual([
				{ key: 'X-Test-1', value: 'value1' },
				{ key: 'X-Test-2', value: 'value2' }
			]);
		});

		it('should parse valid record of headers', () => {
			const row = {
				...baseRow,
				headers_destiny: JSON.stringify({
					'X-Test-1': 'value1',
					'X-Test-2': 'value2'
				})
			};

			const result = toPathRoute(row);
			expect(result.headersDestiny).toEqual([
				{ key: 'X-Test-1', value: 'value1' },
				{ key: 'X-Test-2', value: 'value2' }
			]);
		});

		it('should return empty array for null headers', () => {
			const row = {
				...baseRow,
				headers_destiny: null
			};

			const result = toPathRoute(row);
			expect(result.headersDestiny).toEqual([]);
		});

		it('should return empty array for empty string headers', () => {
			const row = {
				...baseRow,
				headers_destiny: ''
			};

			const result = toPathRoute(row);
			expect(result.headersDestiny).toEqual([]);
		});

		it('should return empty array for "null" string headers', () => {
			const row = {
				...baseRow,
				headers_destiny: 'null'
			};

			const result = toPathRoute(row);
			expect(result.headersDestiny).toEqual([]);
		});

		it('should return empty array for invalid JSON string', () => {
			const row = {
				...baseRow,
				headers_destiny: 'invalid-json'
			};

			const result = toPathRoute(row);
			expect(result.headersDestiny).toEqual([]);
		});

		it('should return empty array for malformed JSON string "{"', () => {
			const row = {
				...baseRow,
				headers_destiny: '{'
			};

			const result = toPathRoute(row);
			expect(result.headersDestiny).toEqual([]);
		});

		it('should ignore invalid entries in an array', () => {
			const row = {
				...baseRow,
				headers_destiny: JSON.stringify([
					{ key: 'Valid', value: 'value' },
					{ missingKey: 'invalid' },
					null,
					{ key: 123, value: 'invalid key type' },
					{ key: 'MissingValue' }
				])
			};

			const result = toPathRoute(row);
			expect(result.headersDestiny).toEqual([
				{ key: 'Valid', value: 'value' },
				{ key: 'MissingValue', value: '' } // missing value defaults to ''
			]);
		});
	});
});
