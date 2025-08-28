import { haversine, scheduledTimeToUnix, xorDecrypt } from "./utils";

function xorEncrypt(text: string, key: string): string {
	let result = "";
	for (let i = 0; i < text.length; i++) {
		result += String.fromCharCode(
			text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
		);
	}
	return Buffer.from(result, "binary").toString("base64");
}

describe("haversine", () => {
	it("returns 0 for identical points", () => {
		expect(haversine(-27.4679, 153.0281, -27.4679, 153.0281)).toBeCloseTo(
			0,
		);
	});

	it("calculates correct distance between Brisbane and Sydney", () => {
		const brisbane = [-27.4679, 153.0281];
		const sydney = [-33.8688, 151.2093];
		const dist = haversine(
			brisbane[0] ?? 0,
			brisbane[1] ?? 0,
			sydney[0] ?? 0,
			sydney[1] ?? 0,
		);
		expect(dist).toBeGreaterThan(700000); // >700km
		expect(dist).toBeLessThan(800000); // <800km
	});
});

describe("xorDecrypt", () => {
	it("decrypts correctly with the right key", () => {
		const original = "hello world";
		const key = "secret";
		const encrypted = xorEncrypt(original, key);
		expect(xorDecrypt(encrypted, key)).toBe(original);
	});

	it("decrypting with wrong key does not return original", () => {
		const original = "hello world";
		const key = "secret";
		const wrongKey = "wrong";
		const encrypted = xorEncrypt(original, key);
		expect(xorDecrypt(encrypted, wrongKey)).not.toBe(original);
	});
});

describe("scheduledTimeToUnix", () => {
	it("returns correct unix time for known input", () => {
		// 2025-08-27 12:34:56 in Australia/Brisbane
		const unix = scheduledTimeToUnix("20250827", "12:34:56");
		const dt = new Date("2025-08-27T12:34:56+10:00");
		expect(unix).toBeCloseTo(Math.floor(dt.getTime() / 1000));
	});

	it("handles midnight correctly", () => {
		const unix = scheduledTimeToUnix("20250101", "00:00:00");
		const dt = new Date("2025-01-01T00:00:00+10:00");
		expect(unix).toBeCloseTo(Math.floor(dt.getTime() / 1000));
	});
});
