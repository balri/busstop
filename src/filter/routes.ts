import csv from "csv-parser";
import fs from "fs";

import { TARGET_ROUTE_ID } from "../routes/status";
import {
	CsvRow,
	Route,
	Routes,
	ROUTES_INPUT_FILE,
	ROUTES_OUTPUT_FILE,
} from "./types";
import { writeJson } from "./utils";

async function filterRoutes(): Promise<{ data: Routes }> {
	return new Promise((resolve, reject) => {
		const filtered: Routes = [];
		fs.createReadStream(ROUTES_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["route_id"] === TARGET_ROUTE_ID) {
					const filteredRow: Route = {
						routeId: row["route_id"] || "",
						routeShortName: row["route_short_name"] || "",
						routeLongName: row["route_long_name"] || "",
						routeUrl: row["route_url"] || "",
						routeColor: row["route_color"] || "",
						routeTextColor: row["route_text_color"] || "",
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
		const { data } = await filterRoutes();
		writeJson(data, ROUTES_OUTPUT_FILE);
		console.log(
			`Filtered routes written to ${ROUTES_OUTPUT_FILE} (${data.length} rows)`,
		);
	} catch (err) {
		console.error("Error:", err);
	}
}

if (require.main === module) {
	main().then(() => process.exit(0));
}
