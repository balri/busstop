import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const TARGET_ROUTE_ID = '61-4158';

const GTFS_DIR = '../../feeds'; // Folder where your GTFS files live (trips.txt, stop_times.txt)
const OUTPUT_FILE = '../../feeds/stop_times_filtered.csv'; // Output CSV file

const tripsFile = path.join(GTFS_DIR, 'trips.txt');
const stopTimesFile = path.join(GTFS_DIR, 'stop_times.txt');

async function parseTrips(): Promise<Set<string>> {
	return new Promise((resolve, reject) => {
		const tripIds = new Set<string>();

		fs.createReadStream(tripsFile)
			.pipe(csv())
			.on('data', (row) => {
				if (row.route_id === TARGET_ROUTE_ID) {
					tripIds.add(row.trip_id);
				}
			})
			.on('end', () => {
				console.log(`Found ${tripIds.size} trips for route ${TARGET_ROUTE_ID}`);
				resolve(tripIds);
			})
			.on('error', reject);
	});
}

async function filterStopTimes(tripIds: Set<string>): Promise<Array<{
	trip_id: string;
	arrival_time: string;
	departure_time: string;
	stop_id: string;
	stop_sequence: string;
}>> {
	return new Promise((resolve, reject) => {
		const filtered: Array<{
			trip_id: string;
			arrival_time: string;
			departure_time: string;
			stop_id: string;
			stop_sequence: string;
		}> = [];

		fs.createReadStream(stopTimesFile)
			.pipe(csv())
			.on('data', (row) => {
				if (tripIds.has(row.trip_id)) {
					// Keep all stop_ids for the route
					filtered.push({
						trip_id: row.trip_id,
						arrival_time: row.arrival_time,
						departure_time: row.departure_time,
						stop_id: row.stop_id,
						stop_sequence: row.stop_sequence
					});
				}
			})
			.on('end', () => {
				console.log(`Filtered ${filtered.length} stop_times rows for route ${TARGET_ROUTE_ID}`);
				resolve(filtered);
			})
			.on('error', reject);
	});
}

async function main() {
	try {
		const tripIds = await parseTrips();
		const filteredStopTimes = await filterStopTimes(tripIds);

		// Write CSV header
		const header = 'trip_id,arrival_time,departure_time,stop_id,stop_sequence\n';
		const rows = filteredStopTimes.map((row: { trip_id: any; arrival_time: any; departure_time: any; stop_id: any; stop_sequence: any; }) =>
			`${row.trip_id},${row.arrival_time},${row.departure_time},${row.stop_id},${row.stop_sequence}`
		);
		fs.writeFileSync(OUTPUT_FILE, header + rows.join('\n'));
		console.log(`Exported filtered stop times to ${OUTPUT_FILE}`);
	} catch (err) {
		console.error('Error during export:', err);
	}
}

main();
