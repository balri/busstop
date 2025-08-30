import csv from "csv-parser";
import fs from "fs";

import { TARGET_ROUTE_ID } from "../routes/status";
import {
	CsvRow,
	Trip,
	Trips,
	TRIPS_INPUT_FILE,
	TRIPS_OUTPUT_FILE,
} from "./types";
import { writeJson } from "./utils";

export async function getServiceIds(): Promise<Set<string>> {
	const serviceIds = new Set<string>();
	const fileContent = await fs.promises.readFile(TRIPS_OUTPUT_FILE, "utf-8");
	const data = JSON.parse(fileContent) as Trips;
	for (const row of data) {
		if (!serviceIds.has(row.serviceId)) {
			serviceIds.add(row.serviceId);
		}
	}
	return serviceIds;
}

export async function getTripIds(): Promise<Set<string>> {
	const tripIds = new Set<string>();
	const fileContent = await fs.readFileSync(TRIPS_OUTPUT_FILE, "utf-8");
	const data = JSON.parse(fileContent) as Trips;
	for (const row of data) {
		tripIds.add(row.tripId);
	}
	return tripIds;
}

export async function filterTrips(): Promise<{ data: Trips }> {
	return new Promise((resolve, reject) => {
		const filtered: Trips = [];
		fs.createReadStream(TRIPS_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["route_id"] === TARGET_ROUTE_ID) {
					const filteredRow: Trip = {
						routeId: row["route_id"] || "",
						serviceId: row["service_id"] || "",
						tripId: row["trip_id"] || "",
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
		const { data } = await filterTrips();
		writeJson(data, TRIPS_OUTPUT_FILE);
		console.log(
			`Filtered trips written to ${TRIPS_OUTPUT_FILE} (${data.length} rows)`,
		);
	} catch (err) {
		console.error("Error:", err);
	}
}

if (require.main === module) {
	main().then(() => process.exit(0));
}
