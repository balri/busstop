import csv from "csv-parser";
import fs from "fs";

import { getServiceIds } from "./trips";
import {
	Calendar,
	Calendars,
	CALENDARS_INPUT_FILE,
	CALENDARS_OUTPUT_FILE,
	CsvRow,
} from "./types";
import { writeJson } from "./utils";

export async function filterCalendars(
	serviceIds: Set<string>,
): Promise<{ data: Calendars }> {
	return new Promise((resolve, reject) => {
		const filtered: Calendars = [];
		fs.createReadStream(CALENDARS_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["service_id"] && serviceIds.has(row["service_id"])) {
					const filteredRow: Calendar = {
						serviceId: row["service_id"] || "",
						monday: row["monday"] === "1",
						tuesday: row["tuesday"] === "1",
						wednesday: row["wednesday"] === "1",
						thursday: row["thursday"] === "1",
						friday: row["friday"] === "1",
						saturday: row["saturday"] === "1",
						sunday: row["sunday"] === "1",
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
		const serviceIds = await getServiceIds();
		const { data } = await filterCalendars(serviceIds);
		writeJson(data, CALENDARS_OUTPUT_FILE);
		console.log(
			`Filtered calendars written to ${CALENDARS_OUTPUT_FILE} (${data.length} rows)`,
		);
	} catch (err) {
		console.error("Error:", err);
	}
}

if (require.main === module) {
	main().then(() => process.exit(0));
}
