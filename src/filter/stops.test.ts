import { jest } from "@jest/globals";
import fs from "fs";
import { Readable } from "stream";

import * as stopsModule from "./stops";

function streamFromString(str: string) {
	const stream = new Readable({
		read() {
			this.push(str);
			this.push(null);
		},
	});
	return stream;
}

describe("stops filter", () => {
	const stopTimesCsv = `trip_id,arrival_time,departure_time,stop_id,stop_sequence
tripA,08:00:00,08:00:00,stop1,1
tripB,09:00:00,09:00:00,stop2,1
tripC,10:00:00,10:00:00,stop3,1
`;

	const stopsCsv = `stop_id,stop_name,stop_lat,stop_lon
stop1,Stop One,-27.49,153.01
stop2,Stop Two,-27.50,153.02
stop3,Stop Three,-27.51,153.03
stop4,Stop Four,-27.52,153.04
`;

	beforeEach(() => {
		/* eslint-disable @typescript-eslint/no-explicit-any */
		jest.spyOn(fs, "createReadStream").mockImplementation((file: any) => {
			let stream: Readable;
			if (file.includes("stop_times_filtered.csv")) {
				stream = streamFromString(stopTimesCsv);
			} else if (file.includes("stops.txt")) {
				stream = streamFromString(stopsCsv);
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

	it("gets stop IDs from stop_times_filtered.csv", async () => {
		const stopIds = await stopsModule.getStopIdsFromCsv(
			"stop_times_filtered.csv",
		);
		expect(stopIds).toEqual(new Set(["stop1", "stop2", "stop3"]));
	});

	it("filters stops.txt to only those in stopIds", async () => {
		const stopIds = new Set(["stop1", "stop3"]);
		const { header, filtered } = await stopsModule.filterStops(stopIds);
		expect(header).toEqual([
			"stop_id",
			"stop_name",
			"stop_lat",
			"stop_lon",
		]);
		expect(filtered.map((r) => r["stop_id"])).toEqual(["stop1", "stop3"]);
	});

	it("writes filtered stops to CSV", () => {
		const header = ["stop_id", "stop_name"];
		const rows = [
			{ stop_id: "stop1", stop_name: "Stop One" },
			{ stop_id: "stop2", stop_name: "Stop Two" },
		];
		const spy = jest.spyOn(fs, "writeFileSync");
		stopsModule.writeCsv(header, rows, "output.csv");
		expect(spy).toHaveBeenCalled();
		const csv = spy.mock.calls[0]?.[1] ?? "";
		expect(csv).toContain('"stop1","Stop One"');
		expect(csv).toContain('"stop2","Stop Two"');
	});
});
