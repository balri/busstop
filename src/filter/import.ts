import sqlite3 from "sqlite3";

import { CsvRows, DbTable } from "./types";

export function importCsvToTable(
	db: sqlite3.Database,
	table: DbTable,
	data: CsvRows,
): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const placeholders = table.columns.map(() => "?").join(",");
		const insertSql = `INSERT INTO ${table.name} VALUES (${placeholders})`;
		db.serialize(() => {
			db.run(`DROP TABLE IF EXISTS ${table.name}`, (err) => {
				if (err) {
					reject(err);
					return;
				}
			});
			db.run(
				`CREATE TABLE ${table.name} (${table.columns.join(",")})`,
				(err) => {
					if (err) {
						reject(err);
						return;
					}
				},
			);
			const stmt = db.prepare(insertSql, (err) => {
				if (err) {
					reject(err);
					return;
				}
			});
			for (const row of data) {
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
			console.log(`Imported ${data.length} rows into ${table.name}`);
			resolve();
		});
	});
}
