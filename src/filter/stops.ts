import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { CsvHeader, CsvRows } from './types';

const STOP_TIMES_FILE = '../../feeds/stop_times_filtered.csv';
const STOPS_FILE = path.join('../../feeds', 'stops.txt');
const OUTPUT_FILE = '../../feeds/stops_filtered.csv';

// 1. Read stop_ids from stop_times_filtered.csv
function getStopIdsFromCsv(file: fs.PathLike): Promise<Set<string>> {
	return new Promise((resolve, reject) => {
		const stopIds = new Set<string>();
		fs.createReadStream(file)
			.pipe(csv())
			.on('data', (row: { stop_id: string; }) => {
				if (row.stop_id) stopIds.add(row.stop_id);
			})
			.on('end', () => resolve(stopIds))
			.on('error', reject);
	});
}

// 2. Filter stops.txt to just those stop_ids
function filterStops(stopIds: Set<string>): Promise<{ header: CsvHeader; filtered: CsvRows }> {
	return new Promise((resolve, reject) => {
		const filtered: CsvRows = [];
		let header: CsvHeader = [];
		fs.createReadStream(STOPS_FILE)
			.pipe(csv())
			.on('headers', (headers: CsvHeader) => { header = headers; })
			.on('data', (row: { stop_id: string; }) => {
				if (row.stop_id && stopIds.has(row.stop_id)) filtered.push(row);
			})
			.on('end', () => resolve({ header, filtered }))
			.on('error', reject);
	});
}

// 3. Write filtered stops to CSV
function writeCsv(header: CsvHeader, rows: CsvRows, file: fs.PathOrFileDescriptor): void {
	const out = [header.join(',')];
	for (const row of rows) {
		out.push(header.map((h: string | number) => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','));
	}
	fs.writeFileSync(file, out.join('\n'));
}

async function main(): Promise<void> {
	try {
		const stopIds = await getStopIdsFromCsv(STOP_TIMES_FILE);
		const { header, filtered } = await filterStops(stopIds);
		writeCsv(header, filtered, OUTPUT_FILE);
		console.log(`Filtered stops written to ${OUTPUT_FILE} (${filtered.length} stops)`);
	} catch (err) {
		console.error('Error:', err);
	}
}

main();
