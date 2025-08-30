import { jest } from "@jest/globals";
import fs from "fs";
import { Readable } from "stream";

import * as stopTimesModule from "./stop_times";

// Helper to create a readable stream from a string
function streamFromString(str: string) {
	const stream = new Readable({
		read() {
			this.push(str);
			this.push(null);
		},
	});
	return stream;
}

describe("stop_times filter", () => {
	const tripsCsv = `route_id,service_id,trip_id
61-4158,service1,tripA
61-4158,service2,tripB
OTHER,service3,tripC
`;

	const stopTimesCsv = `trip_id,arrival_time,departure_time,stop_id,stop_sequence
tripA,08:00:00,08:00:00,stop1,1
tripA,08:10:00,08:10:00,stop2,2
tripB,09:00:00,09:00:00,stop1,1
tripC,10:00:00,10:00:00,stop3,1
`;

	beforeEach(() => {
		/* eslint-disable @typescript-eslint/no-explicit-any */
		jest.spyOn(fs, "createReadStream").mockImplementation((file: any) => {
			let stream: Readable;
			if (file.includes("trips.txt")) {
				stream = streamFromString(tripsCsv);
			} else if (file.includes("stop_times.txt")) {
				stream = streamFromString(stopTimesCsv);
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
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("parses trips for the target route", async () => {
		await expect(stopTimesModule.parseTrips()).resolves.toEqual(
			new Set(["tripA", "tripB"]),
		);
	}, 5000);

	it("filters stop_times for the target trips", async () => {
		const tripIds = new Set(["tripA", "tripB"]);
		const filtered = await stopTimesModule.filterStopTimes(tripIds);
		expect(filtered).toEqual([
			{
				trip_id: "tripA",
				arrival_time: "08:00:00",
				departure_time: "08:00:00",
				stop_id: "stop1",
				stop_sequence: "1",
			},
			{
				trip_id: "tripA",
				arrival_time: "08:10:00",
				departure_time: "08:10:00",
				stop_id: "stop2",
				stop_sequence: "2",
			},
			{
				trip_id: "tripB",
				arrival_time: "09:00:00",
				departure_time: "09:00:00",
				stop_id: "stop1",
				stop_sequence: "1",
			},
		]);
	});
});
