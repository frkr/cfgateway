import { describe, it, expect } from "vitest";
import randomHEX from "../../src/front/lib/randomHEX";

describe("randomHEX", () => {
	it("generates a 128-character string using the default size of 16", async () => {
		const hex = await randomHEX();
		expect(typeof hex).toBe("string");
		expect(hex.length).toBe(128); // SHA-512 outputs 512 bits = 64 bytes = 128 hex chars
		expect(/^[a-f0-9]+$/.test(hex)).toBe(true);
	});

	it("generates a 128-character string using a custom size", async () => {
		const hex = await randomHEX(32);
		expect(typeof hex).toBe("string");
		expect(hex.length).toBe(128); // Always 128 chars due to SHA-512
		expect(/^[a-f0-9]+$/.test(hex)).toBe(true);
	});

	it("generates unique strings on subsequent calls", async () => {
		const hex1 = await randomHEX();
		const hex2 = await randomHEX();
		expect(hex1).not.toBe(hex2);
	});
});
