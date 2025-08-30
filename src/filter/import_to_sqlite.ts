import csv from "csv-parser";
import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";

import { CsvRow, DbTable } from "./types";

const DB_FILE = path.join("../", "gtfs.db");
const FEEDS_DIR = "../../feeds";

export const TABLES: DbTable[] = [
	{
		name: "stop_times",
		file: "stop_times_filtered.csv",
		columns: [
			"trip_id TEXT",
			"arrival_time TEXT",
			"departure_time TEXT",
			"stop_id TEXT",
			"stop_sequence INTEGER",
		],
	},
	{
		name: "stops",
		file: "stops_filtered.csv",
		columns: [
			"stop_id TEXT",
			"stop_code TEXT",
			"stop_name TEXT",
			"stop_desc TEXT",
			"stop_lat REAL",
			"stop_lon REAL",
			"zone_id TEXT",
			"stop_url TEXT",
			"location_type INTEGER",
			"parent_station TEXT",
			"platform_code TEXT",
		],
	},
	{
		name: "trips",
		file: "trips_filtered.csv",
		columns: [
			"route_id TEXT",
			"service_id TEXT",
			"trip_id TEXT",
			"trip_headsign TEXT",
			"direction_id INTEGER",
			"block_id TEXT",
			"shape_id TEXT",
		],
	},
];

export function importCsvToTable(
	db: sqlite3.Database,
	table: DbTable,
	filePath: fs.PathLike,
): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const rows: CsvRow[] = [];
		fs.createReadStream(filePath)
			.pipe(csv())
			.on("data", (row: CsvRow) => rows.push(row))
			.on("end", () => {
				const placeholders = table.columns.map(() => "?").join(",");
				const insertSql = `INSERT INTO ${table.name} VALUES (${placeholders})`;
				db.serialize(() => {
					db.run(`DROP TABLE IF EXISTS ${table.name}`);
					db.run(
						`CREATE TABLE ${table.name} (${table.columns.join(",")})`,
					);
					const stmt = db.prepare(insertSql);
					for (const row of rows) {
						stmt.run(
							table.columns.map((col: string) => {
								const key = col.split(" ")[0];
								if (typeof key === "string" && key in row) {
									return row[key];
								}
								return null;
							}),
						);
					}
					stmt.finalize();
					console.log(
						`Imported ${rows.length} rows into ${table.name}`,
					);
					resolve();
				});
			})
			.on("error", reject);
	});
}

async function main(): Promise<void> {
	const db = new sqlite3.Database(DB_FILE);
	try {
		for (const table of TABLES) {
			const filePath = path.join(FEEDS_DIR, table.file);
			await importCsvToTable(db, table, filePath);
		}
		console.log("All tables imported successfully!");
	} catch (err) {
		console.error("Error importing tables:", err);
	} finally {
		db.close();
	}
}

if (require.main === module) {
	// Only run if called directly, not when imported for tests
	main();
}
