import csv from "csv-parser";
import fs from "fs";
import path from "path";

import { StopTime, StopTimes, Trip } from "./types";

const TARGET_ROUTE_ID = "61-4158";

const GTFS_DIR = "../../feeds"; // Folder where your GTFS files live (trips.txt, stop_times.txt)
const OUTPUT_FILE = "../../feeds/stop_times_filtered.csv"; // Output CSV file

const tripsFile = path.join(GTFS_DIR, "trips.txt");
const stopTimesFile = path.join(GTFS_DIR, "stop_times.txt");

const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

export async function parseTrips(): Promise<Set<string>> {
	return new Promise((resolve, reject) => {
		const tripIds = new Set<string>();

		fs.createReadStream(tripsFile)
			.pipe(csv())
			.on("data", (row: Trip) => {
				if (row.route_id === TARGET_ROUTE_ID && row.trip_id) {
					tripIds.add(row.trip_id);
				}
			})
			.on("end", () => {
				console.log(
					`Found ${tripIds.size} trips for route ${TARGET_ROUTE_ID}`,
				);
				resolve(tripIds);
			})
			.on("error", reject);
	});
}

export async function filterStopTimes(
	tripIds: Set<string>,
): Promise<StopTimes> {
	return new Promise((resolve, reject) => {
		const filtered: StopTimes = [];

		fs.createReadStream(stopTimesFile)
			.pipe(csv())
			.on("data", (row: StopTime) => {
				if (row.trip_id && tripIds.has(row.trip_id)) {
					// Keep all stop_ids for the route
					filtered.push({
						trip_id: row.trip_id ?? "",
						arrival_time: row.arrival_time ?? "",
						departure_time: row.departure_time ?? "",
						stop_id: row.stop_id ?? "",
						stop_sequence: row.stop_sequence ?? "",
					});
				}
			})
			.on("end", () => {
				console.log(
					`Filtered ${filtered.length} stop_times rows for route ${TARGET_ROUTE_ID}`,
				);
				resolve(filtered);
			})
			.on("error", reject);
	});
}

async function main(): Promise<void> {
	try {
		const tripIds = await parseTrips();
		const filteredStopTimes = await filterStopTimes(tripIds);

		// Write CSV header
		const header =
			"trip_id,arrival_time,departure_time,stop_id,stop_sequence\n";
		const rows = filteredStopTimes.map(
			(row: StopTime) =>
				`${row.trip_id},${row.arrival_time},${row.departure_time},${row.stop_id},${row.stop_sequence}`,
		);
		fs.writeFileSync(OUTPUT_FILE, header + rows.join("\n"));
		console.log(`Exported filtered stop times to ${OUTPUT_FILE}`);
	} catch (err) {
		console.error("Error during export:", err);
	}
}

if (require.main === module) {
	// Only run if called directly, not when imported for tests
	main();
}
