import csv from "csv-parser";
import fs from "fs";
import path from "path";

import { CsvHeader, CsvRow, CsvRows } from "./types";

const STOP_TIMES_FILE = "../../feeds/stop_times_filtered.csv";
const TRIPS_FILE = path.join("../../feeds", "trips.txt");
const OUTPUT_FILE = "../../feeds/trips_filtered.csv";

// 1. Read trip_ids from stop_times_filtered.csv
function getTripIdsFromCsv(file: fs.PathLike): Promise<Set<string>> {
	return new Promise((resolve, reject) => {
		const tripIds = new Set<string>();
		fs.createReadStream(file)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["trip_id"]) tripIds.add(row["trip_id"]);
			})
			.on("end", () => resolve(tripIds))
			.on("error", reject);
	});
}

// 2. Filter trips.txt to just those trip_ids
function filterTrips(
	tripIds: Set<string>,
): Promise<{ header: CsvHeader; filtered: CsvRows }> {
	return new Promise((resolve, reject) => {
		const filtered: CsvRows = [];
		let header: CsvHeader = [];
		fs.createReadStream(TRIPS_FILE)
			.pipe(csv())
			.on("headers", (headers: CsvHeader) => {
				header = headers;
			})
			.on("data", (row: CsvRow) => {
				if (row["trip_id"] && tripIds.has(row["trip_id"]))
					filtered.push(row);
			})
			.on("end", () => resolve({ header, filtered }))
			.on("error", reject);
	});
}

// 3. Write filtered trips to CSV
function writeCsv(
	header: CsvHeader,
	rows: CsvRows,
	file: fs.PathOrFileDescriptor,
): void {
	const out = [header.join(",")];
	for (const row of rows) {
		out.push(
			header
				.map((h) => `"${(row[h] || "").replace(/"/g, '""')}"`)
				.join(","),
		);
	}
	fs.writeFileSync(file, out.join("\n"));
}

async function main(): Promise<void> {
	try {
		const tripIds = await getTripIdsFromCsv(STOP_TIMES_FILE);
		const { header, filtered } = await filterTrips(tripIds);
		writeCsv(header, filtered, OUTPUT_FILE);
		console.log(
			`Filtered trips written to ${OUTPUT_FILE} (${filtered.length} trips)`,
		);
	} catch (err) {
		console.error("Error:", err);
	}
}

main();
