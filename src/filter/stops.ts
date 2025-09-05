import csv from "csv-parser";
import fs from "fs";
import sqlite3 from "sqlite3";

import { importCsvToTable } from "./import";
import { getStopIds } from "./stop_times";
import {
	CsvRow,
	CsvRows,
	DB_FILE,
	STOP_TABLE,
	STOPS_INPUT_FILE,
	STOPS_OUTPUT_FILE,
} from "./types";

async function filterStops(stopIds: Set<string>): Promise<{ data: CsvRows }> {
	return new Promise((resolve, reject) => {
		const filtered: CsvRows = [];
		fs.createReadStream(STOPS_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["stop_id"] && stopIds.has(row["stop_id"])) {
					filtered.push(row);
				}
			})
			.on("end", () => resolve({ data: filtered }))
			.on("error", reject);
	});
}

export async function importStops(): Promise<void> {
	const db = new sqlite3.Database(DB_FILE);
	try {
		const stopIds = await getStopIds(db);
		const { data } = await filterStops(stopIds);
		await importCsvToTable(db, STOP_TABLE, data);
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

export async function createJsonStops(): Promise<void> {
	const db = new sqlite3.Database(DB_FILE);
	try {
		const stops: CsvRows = await new Promise((resolve, reject) => {
			db.all(
				`
				SELECT *
				FROM stops
				JOIN stop_directions
				ON stops.stop_id = stop_directions.stop_id
			`,
				(err, rows) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows as CsvRows);
					}
				},
			);
		});
		fs.writeFileSync(STOPS_OUTPUT_FILE, JSON.stringify(stops, null, 2));
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
