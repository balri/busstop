import csv from "csv-parser";
import fs from "fs";
import sqlite3 from "sqlite3";

import { importCsvToTable } from "./import";
import { getServiceIds } from "./trips";
import {
	CALENDAR_DATES_INPUT_FILE,
	CsvRow,
	CsvRows,
	DB_FILE,
	EXCEPTION_TYPE_OMITTED,
	SERVICE_DATES_TABLE,
} from "./types";

async function filterServiceDates(
	serviceIds: Set<string>,
): Promise<{ data: CsvRows }> {
	return new Promise((resolve, reject) => {
		const filtered: CsvRows = [];
		fs.createReadStream(CALENDAR_DATES_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (
					row["service_id"] &&
					serviceIds.has(row["service_id"]) &&
					row["exception_type"] === EXCEPTION_TYPE_OMITTED
				) {
					filtered.push(row);
				}
			})
			.on("end", () => resolve({ data: filtered }))
			.on("error", reject);
	});
}

export async function importServiceDates(): Promise<void> {
	const db = new sqlite3.Database(DB_FILE);
	try {
		const serviceIds = await getServiceIds(db);
		const { data } = await filterServiceDates(serviceIds);
		await importCsvToTable(db, SERVICE_DATES_TABLE, data);
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
