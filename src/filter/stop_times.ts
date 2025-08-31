import csv from "csv-parser";
import fs from "fs";
import sqlite3 from "sqlite3";

import { importCsvToTable } from "./import";
import { getTripIds } from "./trips";
import {
	CsvRow,
	CsvRows,
	DB_FILE,
	STOP_TIMES_INPUT_FILE,
	STOP_TIMES_TABLE,
	StopTimes,
} from "./types";

export async function getStopIds(db: sqlite3.Database): Promise<Set<string>> {
	return new Promise((resolve, reject) => {
		const stopIds = new Set<string>();
		db.all(
			`SELECT DISTINCT stop_id FROM ${STOP_TIMES_TABLE.name}`,
			(err, rows) => {
				if (err) {
					reject(err);
					return;
				}
				for (const row of rows as StopTimes) {
					stopIds.add(row.stop_id);
				}
				resolve(stopIds);
			},
		);
	});
}

async function filterStopTimes(
	tripIds: Set<string>,
): Promise<{ data: CsvRows }> {
	return new Promise((resolve, reject) => {
		const filtered: CsvRows = [];
		fs.createReadStream(STOP_TIMES_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["trip_id"] && tripIds.has(row["trip_id"])) {
					filtered.push(row);
				}
			})
			.on("end", () => resolve({ data: filtered }))
			.on("error", reject);
	});
}

export async function importStopTimes(): Promise<void> {
	const db = new sqlite3.Database(DB_FILE);
	try {
		const tripIds = await getTripIds(db);
		const { data } = await filterStopTimes(tripIds);
		await importCsvToTable(db, STOP_TIMES_TABLE, data);
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
