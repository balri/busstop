const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const TARGET_ROUTE_ID = '61-4158';
const TARGET_STOP_ID = '3054';

const GTFS_DIR = '../feeds'; // Folder where your GTFS files live (trips.txt, stop_times.txt)
const OUTPUT_FILE = 'stop_times_filtered.json'; // Output JSON file

const tripsFile = path.join(GTFS_DIR, 'trips.txt');
const stopTimesFile = path.join(GTFS_DIR, 'stop_times.txt');

async function parseTrips() {
	return new Promise((resolve, reject) => {
		const tripIds = new Set();

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

async function filterStopTimes(tripIds) {
	return new Promise((resolve, reject) => {
		const filtered = [];

		fs.createReadStream(stopTimesFile)
			.pipe(csv())
			.on('data', (row) => {
				if (tripIds.has(row.trip_id) && row.stop_id === TARGET_STOP_ID) {
					filtered.push({
						trip_id: row.trip_id,
						arrival_time: row.arrival_time
					});
				}
			})
			.on('end', () => {
				console.log(`Filtered ${filtered.length} stop_times rows matching route ${TARGET_ROUTE_ID} and stop ${TARGET_STOP_ID}`);
				resolve(filtered);
			})
			.on('error', reject);
	});
}

async function main() {
	try {
		const tripIds = await parseTrips();
		const filteredStopTimes = await filterStopTimes(tripIds);
		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(filteredStopTimes, null, 2));
		console.log(`Exported filtered stop times to ${OUTPUT_FILE}`);
	} catch (err) {
		console.error('Error during export:', err);
	}
}

main();
