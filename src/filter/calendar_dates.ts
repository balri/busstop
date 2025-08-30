import csv from "csv-parser";
import fs from "fs";

import { getServiceIds } from "./trips";
import {
	CALENDAR_DATES_INPUT_FILE,
	CALENDAR_DATES_OUTPUT_FILE,
	CalendarDates,
	CsvRow,
} from "./types";
import { writeJson } from "./utils";

export async function filterCalendarDates(
	serviceIds: Set<string>,
): Promise<{ data: CalendarDates }> {
	return new Promise((resolve, reject) => {
		const filtered: CalendarDates = [];
		fs.createReadStream(CALENDAR_DATES_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["service_id"] && serviceIds.has(row["service_id"])) {
					const filteredRow = {
						serviceId: row["service_id"] || "",
						date: row["date"] || "",
						exceptionType: row["exception_type"] || "",
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
		const { data } = await filterCalendarDates(serviceIds);
		writeJson(data, CALENDAR_DATES_OUTPUT_FILE);
		console.log(
			`Filtered calendar dates written to ${CALENDAR_DATES_OUTPUT_FILE} (${data.length} rows)`,
		);
	} catch (err) {
		console.error("Error:", err);
	}
}

if (require.main === module) {
	main().then(() => process.exit(0));
}
