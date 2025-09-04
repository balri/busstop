import sqlite3 from "sqlite3";

import { importCsvToTable } from "./import";
import { getStopIds } from "./stop_times";
import {
	CsvRows,
	DB_FILE,
	STOP_DIRECTIONS_TABLE,
	STOP_TIMES_TABLE,
	TRIPS_TABLE,
} from "./types";

async function filterStopDirections(
	db: sqlite3.Database,
	stopIds: Set<string>,
): Promise<{ data: CsvRows }> {
	return new Promise((resolve, reject) => {
		const filtered: CsvRows = [];
		db.all(
			`SELECT DISTINCT stop_id, direction_id
			FROM ${STOP_TIMES_TABLE.name}
			JOIN ${TRIPS_TABLE.name}
			ON stop_times.trip_id = trips.trip_id
			WHERE stop_id IN (${Array.from(stopIds)
				.map(() => "?")
				.join(",")})
			`,
			Array.from(stopIds),
			(err, rows) => {
				if (err) {
					reject(err);
					return;
				}
				for (const row of rows as CsvRows) {
					filtered.push(row);
				}
				resolve({ data: filtered });
			},
		);
	});
}

export async function importStopDirections(): Promise<void> {
	const db = new sqlite3.Database(DB_FILE);
	try {
		const stopIds = await getStopIds(db);
		const { data } = await filterStopDirections(db, stopIds);
		await importCsvToTable(db, STOP_DIRECTIONS_TABLE, data);
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
