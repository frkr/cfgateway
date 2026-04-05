import { describe, it, expect } from "vitest";
import isEmpty from "../../../src/front/lib/isEmpty";

describe("isEmpty utility", () => {
	it("returns true for null", () => {
		expect(isEmpty(null)).toBe(true);
	});

	it("returns true for undefined", () => {
		expect(isEmpty(undefined)).toBe(true);
	});

	it("returns true for an empty string", () => {
		expect(isEmpty("")).toBe(true);
	});

	it("returns true for a string with only spaces", () => {
		expect(isEmpty("   ")).toBe(true);
	});

	it("returns true for the string 'null'", () => {
		expect(isEmpty("null")).toBe(true);
	});

	it("returns true for the string 'undefined'", () => {
		expect(isEmpty("undefined")).toBe(true);
	});

	it("returns false for a non-empty string", () => {
		expect(isEmpty("hello")).toBe(false);
	});

	it("returns false for a string with leading/trailing spaces but actual content", () => {
		expect(isEmpty("  hello  ")).toBe(false);
	});
});
