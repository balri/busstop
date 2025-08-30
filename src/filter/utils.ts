import csv from "csv-parser";
import * as fs from "fs";

import { CsvHeader, CsvRow, CsvRows, FeedData } from "./types";

export function getIds(col: string, file: fs.PathLike): Promise<Set<string>> {
	return new Promise((resolve, reject) => {
		const stopIds = new Set<string>();
		fs.createReadStream(file)
			.pipe(csv())
			.on("data", (row: CsvRow) => {
				if (row[col]) stopIds.add(row[col]);
			})
			.on("end", () => resolve(stopIds))
			.on("error", reject);
	});
}

export function writeCsv(
	header: CsvHeader,
	rows: CsvRows,
	file: fs.PathOrFileDescriptor,
): void {
	const out = [header.join(",")];
	for (const row of rows) {
		out.push(
			header
				.map((h) => `"${(row[h] || "").replace(/"/g, '""')}"`)
				.join(","),
		);
	}
	fs.writeFileSync(file, out.join("\n"));
}

export function writeJson(data: FeedData, file: fs.PathOrFileDescriptor): void {
	fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
