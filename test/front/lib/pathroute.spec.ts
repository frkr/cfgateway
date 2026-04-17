import { describe, expect, it } from 'vitest';
import { toPathRoute, type PathRouteRow } from '../../../src/front/lib/pathroute';

describe('pathroute', () => {
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
