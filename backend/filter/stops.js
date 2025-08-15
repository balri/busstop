const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const STOP_TIMES_FILE = '../../feeds/stop_times_filtered.csv'; // or .json if you prefer
const STOPS_FILE = path.join('../../feeds', 'stops.txt');
const OUTPUT_FILE = '../../feeds/stops_filtered.csv';

// 1. Read stop_ids from stop_times_filtered.csv
function getStopIdsFromCsv(file) {
	return new Promise((resolve, reject) => {
		const stopIds = new Set();
		fs.createReadStream(file)
			.pipe(csv())
			.on('data', row => {
				if (row.stop_id) stopIds.add(row.stop_id);
			})
			.on('end', () => resolve(stopIds))
			.on('error', reject);
	});
}

// 2. Filter stops.txt to just those stop_ids
function filterStops(stopIds) {
	return new Promise((resolve, reject) => {
		const filtered = [];
		let header = null;
		fs.createReadStream(STOPS_FILE)
			.pipe(csv())
			.on('headers', (headers) => { header = headers; })
			.on('data', row => {
				if (stopIds.has(row.stop_id)) filtered.push(row);
			})
			.on('end', () => resolve({ header, filtered }))
			.on('error', reject);
	});
}

// 3. Write filtered stops to CSV
function writeCsv(header, rows, file) {
	const out = [header.join(',')];
	for (const row of rows) {
		out.push(header.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','));
	}
	fs.writeFileSync(file, out.join('\n'));
}

async function main() {
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
