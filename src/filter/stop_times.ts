import csv from "csv-parser";
import fs from "fs";

import { getTripIds } from "./trips";
import {
	CsvRow,
	STOP_TIMES_INPUT_FILE,
	STOP_TIMES_OUTPUT_FILE,
	StopTimes,
} from "./types";
import { writeJson } from "./utils";

export async function getStopIds(): Promise<Set<string>> {
	const stopIds = new Set<string>();
	const fileContent = await fs.promises.readFile(
		STOP_TIMES_OUTPUT_FILE,
		"utf-8",
	);
	const data = JSON.parse(fileContent) as StopTimes;
	for (const row of data) {
		if (!stopIds.has(row.stopId)) {
			stopIds.add(row.stopId);
		}
	}
	return stopIds;
}

export async function filterStopTimes(
	tripIds: Set<string>,
): Promise<{ data: StopTimes }> {
	return new Promise((resolve, reject) => {
		const filtered: StopTimes = [];
		fs.createReadStream(STOP_TIMES_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["trip_id"] && tripIds.has(row["trip_id"])) {
					const filteredRow = {
						tripId: row["trip_id"] || "",
						arrivalTime: row["arrival_time"] || "",
						stopId: row["stop_id"] || "",
					};
					filtered.push(filteredRow);
				}
			})
			.on("end", () => resolve({ data: filtered }))
			.on("error", reject);
	});
}

async function main(): Promise<void> {
	try {
		const tripIds = await getTripIds();
		const { data } = await filterStopTimes(tripIds);
		writeJson(data, STOP_TIMES_OUTPUT_FILE);
		console.log(
			`Filtered stop times written to ${STOP_TIMES_OUTPUT_FILE} (${data.length} rows)`,
		);
	} catch (err) {
		console.error("Error:", err);
	}
}

if (require.main === module) {
	main().then(() => process.exit(0));
}
