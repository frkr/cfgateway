import { describe, it, expect } from "vitest";
import randomHEX from "../src/front/lib/randomHEX";
import crypto from "node:crypto";

describe("randomHEX", () => {
    // Inject Node's webcrypto if global crypto is not present (for non-worker vitest runs)
    if (typeof globalThis.crypto === 'undefined') {
        // @ts-ignore
        globalThis.crypto = crypto.webcrypto;
    }

	it("returns a string", async () => {
		const result = await randomHEX();
		expect(typeof result).toBe("string");
	});

	it("returns a valid hex string", async () => {
		const result = await randomHEX();
		// SHA-512 outputs 64 bytes, which is 128 hex characters
		expect(result).toMatch(/^[0-9a-f]{128}$/);
	});

	it("returns different results on successive calls", async () => {
		const result1 = await randomHEX();
		const result2 = await randomHEX();
		expect(result1).not.toBe(result2);
	});

    it("handles different input sizes correctly", async () => {
        // The size parameter defines the input byte length to getRandomValues,
        // but the output is always SHA-512 digested, so it'll still be 128 characters long
        const result = await randomHEX(32);
        expect(result).toMatch(/^[0-9a-f]{128}$/);
    });
});
