import { safeCompare } from '../../../../src/front/.server/panel/auth';
import { test, expect } from 'vitest';

test('safeCompare', () => {
    expect(safeCompare('a', 'a')).toBe(true);
    expect(safeCompare('a', 'b')).toBe(false);
    expect(safeCompare('abc', 'abcd')).toBe(false);
});
