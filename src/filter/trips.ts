import csv from "csv-parser";
import fs from "fs";
import sqlite3 from "sqlite3";

import { TARGET_ROUTE_ID } from "../routes/status";
import { importCsvToTable } from "./import";
import {
	CsvRow,
	CsvRows,
	DB_FILE,
	Trips,
	TRIPS_INPUT_FILE,
	TRIPS_TABLE,
} from "./types";

export async function getServiceIds(
	db: sqlite3.Database,
): Promise<Set<string>> {
	return new Promise((resolve, reject) => {
		const serviceIds = new Set<string>();
		db.all(
			`SELECT DISTINCT service_id FROM ${TRIPS_TABLE.name}`,
			(err, rows) => {
				if (err) {
					reject(err);
					return;
				}
				for (const row of rows as Trips) {
					serviceIds.add(row.service_id);
				}
				resolve(serviceIds);
			},
		);
	});
}

export async function getTripIds(db: sqlite3.Database): Promise<Set<string>> {
	return new Promise((resolve, reject) => {
		const tripIds = new Set<string>();
		db.all(
			`SELECT DISTINCT trip_id FROM ${TRIPS_TABLE.name}`,
			(err, rows) => {
				if (err) {
					reject(err);
					return;
				}
				for (const row of rows as Trips) {
					tripIds.add(row.trip_id);
				}
				resolve(tripIds);
			},
		);
	});
}

async function filterTrips(): Promise<{ data: CsvRows }> {
	return new Promise((resolve, reject) => {
		const filtered: CsvRows = [];
		fs.createReadStream(TRIPS_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["route_id"] === TARGET_ROUTE_ID) {
					filtered.push(row);
				}
			})
			.on("end", () => resolve({ data: filtered }))
			.on("error", reject);
	});
}

export async function importTrips(): Promise<void> {
	const db = new sqlite3.Database(DB_FILE);
	try {
		const { data } = await filterTrips();
		await importCsvToTable(db, TRIPS_TABLE, data);
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
