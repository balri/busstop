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
	Stops,
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

		// Merge stops with same stop_id and direction_id, combine route_ids
		const merged: Record<string, Stops> = {};
		for (const stop of stops) {
			const key = `${stop["stop_id"]}|${stop["direction_id"]}`;
			if (!merged[key]) {
				merged[key] = {
					stop_id: stop["stop_id"] || "",
					stop_code: stop["stop_code"] || "",
					stop_name: stop["stop_name"] || "",
					stop_desc: stop["stop_desc"] || "",
					stop_lat: parseFloat(stop["stop_lat"] || "0"),
					stop_lon: parseFloat(stop["stop_lon"] || "0"),
					direction_id: parseInt(stop["direction_id"] || "0", 10),
					route_ids: [stop["route_id"] || ""],
				};
			} else {
				if (!merged[key].route_ids.includes(stop["route_id"] || "")) {
					merged[key].route_ids.push(stop["route_id"] || "");
				}
			}
		}
		const mergedStops = Object.values(merged);
		fs.writeFileSync(
			STOPS_OUTPUT_FILE,
			JSON.stringify(mergedStops, null, 2),
		);
		console.log(
			`Added ${mergedStops.length} stops to ${STOPS_OUTPUT_FILE}`,
		);
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
