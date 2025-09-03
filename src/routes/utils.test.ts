import { haversine, xorDecrypt } from "./utils";

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
