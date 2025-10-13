import csv from "csv-parser";
import fs from "fs";
import sqlite3 from "sqlite3";

import { importCsvToTable } from "./import";
import {
	CsvRow,
	CsvRows,
	DB_FILE,
	ROUTES_INPUT_FILE,
	ROUTES_TABLE,
} from "./types";

export const TARGET_ROUTE_SHORT_NAME = "61";

export async function getRouteId(db: sqlite3.Database): Promise<string> {
	return new Promise((resolve, reject) => {
		db.get(
			`SELECT route_id FROM ${ROUTES_TABLE.name} WHERE route_short_name = ? LIMIT 1`,
			[TARGET_ROUTE_SHORT_NAME],
			(err, row: CsvRow) => {
				if (err) {
					reject(err);
					return;
				}
				if (row && row["route_id"]) {
					resolve(row["route_id"]);
				} else {
					reject(
						new Error(
							`No route found with route_short_name = ${TARGET_ROUTE_SHORT_NAME}`,
						),
					);
				}
			},
		);
	});
}

async function filterRoutes(): Promise<{ data: CsvRows }> {
	return new Promise((resolve, reject) => {
		const filtered: CsvRows = [];
		fs.createReadStream(ROUTES_INPUT_FILE)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row["route_short_name"] === TARGET_ROUTE_SHORT_NAME) {
					filtered.push(row);
				}
			})
			.on("end", () => resolve({ data: filtered }))
			.on("error", reject);
	});
}

export async function importRoutes(): Promise<void> {
	const db = new sqlite3.Database(DB_FILE);
	try {
		const { data } = await filterRoutes();
		await importCsvToTable(db, ROUTES_TABLE, data);
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
