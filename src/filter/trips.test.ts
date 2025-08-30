import { jest } from "@jest/globals";
import fs from "fs";
import { Readable } from "stream";

import * as tripsModule from "./trips";

function streamFromString(str: string) {
	const stream = new Readable({
		read() {
			this.push(str);
			this.push(null);
		},
	});
	return stream;
}

describe("trips filter", () => {
	const stopTimesCsv = `trip_id,arrival_time,departure_time,stop_id,stop_sequence
tripA,08:00:00,08:00:00,stop1,1
tripB,09:00:00,09:00:00,stop2,1
tripC,10:00:00,10:00:00,stop3,1
`;

	const tripsCsv = `route_id,service_id,trip_id
61-4158,service1,tripA
61-4158,service2,tripB
OTHER,service3,tripC
OTHER,service4,tripD
`;

	beforeEach(() => {
		/* eslint-disable @typescript-eslint/no-explicit-any */
		jest.spyOn(fs, "createReadStream").mockImplementation((file: any) => {
			let stream: Readable;
			if (file.includes("stop_times_filtered.csv")) {
				stream = streamFromString(stopTimesCsv);
			} else if (file.includes("trips.txt")) {
				stream = streamFromString(tripsCsv);
			} else {
				throw new Error("Unknown file: " + file);
			}
			return Object.assign(stream, {
				close: () => {},
				bytesRead: 0,
				path: file,
				pending: false,
			});
		});
		jest.spyOn(fs, "writeFileSync").mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("gets trip IDs from stop_times_filtered.csv", async () => {
		const tripIds = await tripsModule.getTripIdsFromCsv(
			"stop_times_filtered.csv",
		);
		expect(tripIds).toEqual(new Set(["tripA", "tripB", "tripC"]));
	});

	it("filters trips.txt to only those in tripIds", async () => {
		const tripIds = new Set(["tripA", "tripC"]);
		const { header, filtered } = await tripsModule.filterTrips(tripIds);
		expect(header).toEqual(["route_id", "service_id", "trip_id"]);
		expect(filtered.map((r) => r["trip_id"])).toEqual(["tripA", "tripC"]);
	});

	it("writes filtered trips to CSV", () => {
		const header = ["route_id", "service_id", "trip_id"];
		const rows = [
			{ route_id: "61-4158", service_id: "service1", trip_id: "tripA" },
			{ route_id: "OTHER", service_id: "service3", trip_id: "tripC" },
		];
		const spy = jest.spyOn(fs, "writeFileSync");
		tripsModule.writeCsv(header, rows, "output.csv");
		expect(spy).toHaveBeenCalled();
		const csv = spy.mock.calls[0]?.[1] ?? "";
		expect(csv).toContain('"61-4158","service1","tripA"');
		expect(csv).toContain('"OTHER","service3","tripC"');
	});
});
