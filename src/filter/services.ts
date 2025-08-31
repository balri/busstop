import csv from "csv-parser";
import fs from "fs";
import sqlite3 from "sqlite3";

import { importCsvToTable } from "./import";
import { getServiceIds } from "./trips";
import {
	CALENDARS_INPUT_FILE,
	CsvRow,
	CsvRows,
	DB_FILE,
	SERVICES_TABLE,
} from "./types";

async function filterServices(
	serviceIds: Set<string>,
): Promise<{ data: CsvRows }> {
	return new Promise((resolve, reject) => {
		const filtered: CsvRows = [];
		fs.createReadStream(CALENDARS_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["service_id"] && serviceIds.has(row["service_id"])) {
					filtered.push(row);
				}
			})
			.on("end", () => resolve({ data: filtered }))
			.on("error", reject);
	});
}

export async function importServices(): Promise<void> {
	const db = new sqlite3.Database(DB_FILE);
	try {
		const serviceIds = await getServiceIds(db);
		const { data } = await filterServices(serviceIds);
		importCsvToTable(db, SERVICES_TABLE, data);
	} catch (err) {
		console.error("Error:", err);
	} finally {
		await new Promise<void>((resolve, reject) => {
			db.close((err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
}
