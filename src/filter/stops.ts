import csv from "csv-parser";
import fs from "fs";

import { getStopIds } from "./stop_times";
import {
	CsvRow,
	Stop,
	Stops,
	STOPS_INPUT_FILE,
	STOPS_OUTPUT_FILE,
} from "./types";
import { writeJson } from "./utils";

export async function filterStops(
	stopIds: Set<string>,
): Promise<{ data: Stops }> {
	return new Promise((resolve, reject) => {
		const filtered: Stops = [];
		fs.createReadStream(STOPS_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["stop_id"] && stopIds.has(row["stop_id"])) {
					const filteredRow: Stop = {
						stopId: row["stop_id"] || "",
						stopName: row["stop_name"] || "",
						stopLat: row["stop_lat"] || "",
						stopLon: row["stop_lon"] || "",
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
		const stopIds = await getStopIds();
		const { data } = await filterStops(stopIds);
		writeJson(data, STOPS_OUTPUT_FILE);
		console.log(
			`Filtered stops written to ${STOPS_OUTPUT_FILE} (${data.length} rows)`,
		);
	} catch (err) {
		console.error("Error:", err);
	}
}

if (require.main === module) {
	main().then(() => process.exit(0));
}
