import { describe, it, expect } from "vitest";
import mqfilename from "../../../src/front/lib/mqfilename";

describe("mqfilename", () => {
	it("formats a date and nextId correctly", () => {
		// 2024-05-20 15:30:45
		const agora = new Date(2024, 4, 20, 15, 30, 45);
		const nextId = "abc-123";
		const result = mqfilename(agora, nextId);
		expect(result).toBe("2024520153045-abc-123.txt");
	});

	it("handles single digit months and days correctly", () => {
		// 2024-01-05 08:05:03
		const agora = new Date(2024, 0, 5, 8, 5, 3);
		const nextId = "xyz-789";
		const result = mqfilename(agora, nextId);
		// Month is 0-indexed, so 0 + 1 = 1
		expect(result).toBe("202415853-xyz-789.txt");
	});

	it("handles December 31st at 23:59:59 correctly", () => {
		// 2023-12-31 23:59:59
		const agora = new Date(2023, 11, 31, 23, 59, 59);
		const nextId = "end-of-year";
		const result = mqfilename(agora, nextId);
		expect(result).toBe("20231231235959-end-of-year.txt");
	});

	it("works with an empty string as nextId", () => {
		const agora = new Date(2025, 2, 10, 10, 0, 0);
		const result = mqfilename(agora, "");
		expect(result).toBe("20253101000-.txt");
	});
});
