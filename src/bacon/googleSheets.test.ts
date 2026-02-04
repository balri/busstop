import {
	getDailyActorFromSheet,
	isActorInSheet,
	setDailyActorInSheet,
} from "./googleSheets";
import { Actor } from "./types";

jest.mock("googleapis", () => {
	const mockGet = jest.fn();
	const mockUpdate = jest.fn();
	const mockAppend = jest.fn();
	return {
		google: {
			sheets: () => ({
				spreadsheets: {
					values: {
						get: mockGet,
						update: mockUpdate,
						append: mockAppend,
					},
				},
			}),
		},
		__esModule: true,
		mockGet,
		mockUpdate,
		mockAppend,
	};
});

jest.mock("./actorCredits", () => ({
	getActor: jest.fn(),
}));

jest.mock("./cache", () => ({
	setCache: jest.fn(),
}));

const { mockGet, mockUpdate, mockAppend } = jest.requireMock("googleapis");
const { getActor } = jest.requireMock("./actorCredits");

const sampleActor: Actor = {
	id: 123,
	name: "Test Actor",
	known_for: [],
	known_for_department: "Acting",
	profile_path: "/test.jpg",
	adult: false,
};

describe("getDailyActorFromSheet", () => {
	beforeEach(() => {
		mockGet.mockReset();
		getActor.mockReset();
	});

	it("returns actor if found in sheet", async () => {
		mockGet.mockResolvedValue({
			data: {
				values: [
					[
						"1",
						"2026-02-01",
						"123",
						"2",
						"Test Actor",
						"2026-02-01T00:00:00Z",
						"{}",
					],
				],
			},
		});
		getActor.mockResolvedValue({ ...sampleActor });
		const result = await getDailyActorFromSheet("2026-02-01");
		expect(result).toMatchObject({ id: 123, name: "Test Actor" });
	});

	it("returns null if actor not found in sheet", async () => {
		mockGet.mockResolvedValue({ data: { values: [] } });
		const result = await getDailyActorFromSheet("2026-02-01");
		expect(result).toBeNull();
	});

	it("returns null if getActor returns null", async () => {
		mockGet.mockResolvedValue({
			data: {
				values: [
					[
						"1",
						"2026-02-01",
						"123",
						"2",
						"Test Actor",
						"2026-02-01T00:00:00Z",
						"{}",
					],
				],
			},
		});
		getActor.mockResolvedValue(null);
		const result = await getDailyActorFromSheet("2026-02-01");
		expect(result).toBeNull();
	});
});

describe("isActorInSheet", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it("returns true if actor is present", async () => {
		mockGet.mockResolvedValue({
			data: {
				values: [
					[
						"1",
						"2026-02-01",
						"123",
						"2",
						"Actor Name",
						"2026-02-01T00:00:00Z",
						"{}",
					],
				],
			},
		});
		const result = await isActorInSheet(123);
		expect(result).toBe(true);
	});

	it("returns false if actor is not present", async () => {
		mockGet.mockResolvedValue({
			data: {
				values: [
					[
						"1",
						"2026-02-01",
						"456",
						"2",
						"Other Actor",
						"2026-02-01T00:00:00Z",
						"{}",
					],
				],
			},
		});
		const result = await isActorInSheet(123);
		expect(result).toBe(false);
	});

	it("respects daysWindow parameter", async () => {
		mockGet.mockResolvedValue({
			data: {
				values: [
					[
						"1",
						"2026-02-01",
						"123",
						"2",
						"Actor Name",
						"2026-02-01T00:00:00Z",
						"{}",
					],
					[
						"2",
						"2026-01-01",
						"789",
						"2",
						"Old Actor",
						"2026-01-01T00:00:00Z",
						"{}",
					],
				],
			},
		});

		const result = await isActorInSheet(789, 1);
		expect(result).toBe(false);
	});

	it("returns false if sheet is empty", async () => {
		mockGet.mockResolvedValue({ data: { values: [] } });
		const result = await isActorInSheet(123);
		expect(result).toBe(false);
	});
});

describe("setDailyActorInSheet", () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockUpdate.mockReset();
		mockAppend.mockReset();
	});

	it("updates existing row if date matches", async () => {
		mockGet.mockResolvedValue({
			data: {
				values: [
					[
						"1",
						"2026-02-01",
						"123",
						"2",
						"Test Actor",
						"2026-02-01T00:00:00Z",
						"{}",
					],
				],
			},
		});
		await setDailyActorInSheet("2026-02-01", sampleActor, {
			depth: 2,
			path: [],
		});
		expect(mockUpdate).toHaveBeenCalled();
		expect(mockAppend).not.toHaveBeenCalled();
	});

	it("appends new row if date not found", async () => {
		mockGet.mockResolvedValue({
			data: {
				values: [
					[
						"1",
						"2026-01-01",
						"456",
						"2",
						"Other Actor",
						"2026-01-01T00:00:00Z",
						"{}",
					],
				],
			},
		});
		await setDailyActorInSheet("2026-02-01", sampleActor, {
			depth: 2,
			path: [],
		});
		expect(mockAppend).toHaveBeenCalled();
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it("handles empty sheet and appends", async () => {
		mockGet.mockResolvedValue({ data: { values: [] } });
		await setDailyActorInSheet("2026-02-01", sampleActor, {
			depth: 2,
			path: [],
		});
		expect(mockAppend).toHaveBeenCalled();
	});
});
