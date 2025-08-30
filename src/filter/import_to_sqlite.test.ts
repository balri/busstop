import { jest } from "@jest/globals";
import fs from "fs";
import sqlite3 from "sqlite3";
import { Readable } from "stream";

import { importCsvToTable, TABLES } from "./import_to_sqlite";

function streamFromString(str: string) {
	const stream = new Readable({
		read() {
			this.push(str);
			this.push(null);
		},
	});
	return stream;
}

describe("importCsvToTable", () => {
	const stopTimesCsv = `trip_id,arrival_time,departure_time,stop_id,stop_sequence
tripA,08:00:00,08:00:00,stop1,1
tripB,09:00:00,09:00:00,stop2,2
`;

	beforeEach(() => {
		/* eslint-disable @typescript-eslint/no-explicit-any */
		jest.spyOn(fs, "createReadStream").mockImplementation((file: any) => {
			if (file.includes("stop_times_filtered.csv")) {
				const stream = streamFromString(stopTimesCsv);
				return Object.assign(stream, {
					close: () => {},
					bytesRead: 0,
					path: file,
					pending: false,
				});
			}
			throw new Error("Unknown file: " + file);
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("creates table and inserts rows from CSV", async () => {
		const db = new sqlite3.Database(":memory:");
		const table = TABLES.find((t) => t.name === "stop_times")!;
		await importCsvToTable(db, table, "stop_times_filtered.csv");

		// Query the table to check inserted rows
		await new Promise<void>((resolve, reject) => {
			db.all("SELECT * FROM stop_times", (err, rows) => {
				if (err) return reject(err);
				expect(Array.isArray(rows)).toBe(true);
				const typedRows = rows as Array<{
					trip_id: string;
					stop_id: string;
				}>;
				expect(typedRows.length).toBe(2);
				expect(typedRows[0]).toBeDefined();
				expect(typedRows[1]).toBeDefined();
				expect(typedRows[0]!.trip_id).toBe("tripA");
				expect(typedRows[1]!.stop_id).toBe("stop2");
				resolve();
			});
		});
		db.close();
	});
});
