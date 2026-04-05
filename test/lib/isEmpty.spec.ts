import { describe, it, expect } from "vitest";
import { isEmpty } from "../../app/lib/isEmpty";

describe("isEmpty", () => {
    it("returns true for null", () => {
        expect(isEmpty(null)).toBe(true);
    });

    it("returns true for undefined", () => {
        expect(isEmpty(undefined)).toBe(true);
    });

    it("returns true for empty string", () => {
        expect(isEmpty("")).toBe(true);
    });

    it("returns true for string with only spaces", () => {
        expect(isEmpty("   ")).toBe(true);
    });

    it("returns true for string 'null'", () => {
        expect(isEmpty("null")).toBe(true);
    });

    it("returns true for string 'undefined'", () => {
        expect(isEmpty("undefined")).toBe(true);
    });

    it("returns false for non-empty string", () => {
        expect(isEmpty("test")).toBe(false);
    });

    it("returns false for number as string", () => {
        expect(isEmpty("0")).toBe(false);
    });
});
