import { db, getScheduledTime } from "./db";

describe("getScheduledTime", () => {
	it("returns null for unknown trip and stop", async () => {
		const result = await getScheduledTime(
			"nonexistent_trip",
			"nonexistent_stop",
		);
		expect(result).toBeNull();
	});

	it("returns null if tripId is valid but stopId is invalid", async () => {
		const result = await getScheduledTime(
			"34096908-BT 25_26-40393",
			"invalid_stop",
		);
		expect(result).toBeNull();
	});

	it("returns null if stopId is valid but tripId is invalid", async () => {
		const result = await getScheduledTime("invalid_trip", "19064");
		expect(result).toBeNull();
	});

	it("returns correct time for known trip and stop", async () => {
		const result = await getScheduledTime(
			"34096908-BT 25_26-40393",
			"19064",
		);
		expect(result).toBe("07:37:00");
	});

	it("returns a string in HH:MM:SS format for valid inputs", async () => {
		const result = await getScheduledTime(
			"34096908-BT 25_26-40393",
			"19064",
		);
		expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
	});
});

afterAll(() => {
	db.close();
});
