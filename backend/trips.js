const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();

const TARGET_ROUTE_ID = '61-4158';
const TARGET_STOP_ID = '3054';

const GTFS_DIR = '../feeds'; // Folder where your GTFS files live (trips.txt, stop_times.txt)
const DB_FILE = 'busdata.db'; // SQLite database file

const tripsFile = path.join(GTFS_DIR, 'trips.txt');
const stopTimesFile = path.join(GTFS_DIR, 'stop_times.txt');

const db = new sqlite3.Database(DB_FILE);

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

async function importFilteredStopTimes(tripIds) {
	return new Promise((resolve, reject) => {
		db.serialize(() => {
			// Create table and index
			db.run(`DROP TABLE IF EXISTS stop_times_filtered`);
			db.run(`CREATE TABLE stop_times_filtered (
				trip_id TEXT,
				stop_id TEXT,
				arrival_time TEXT,
				departure_time TEXT,
				stop_sequence INTEGER
			)`);
			db.run(`CREATE INDEX idx_trip_stop ON stop_times_filtered(trip_id, stop_id)`);

			const insertStmt = db.prepare(
				`INSERT INTO stop_times_filtered (trip_id, stop_id, arrival_time, departure_time, stop_sequence) VALUES (?, ?, ?, ?, ?)`
			);

			let rowCount = 0;

			fs.createReadStream(stopTimesFile)
				.pipe(csv())
				.on('data', (row) => {
					if (tripIds.has(row.trip_id) && row.stop_id === TARGET_STOP_ID) {
						insertStmt.run(
							row.trip_id,
							row.stop_id,
							row.arrival_time,
							row.departure_time,
							Number(row.stop_sequence)
						);
						rowCount++;
					}
				})
				.on('end', () => {
					insertStmt.finalize();
					console.log(`Imported ${rowCount} stop_times rows matching route ${TARGET_ROUTE_ID} and stop ${TARGET_STOP_ID}`);
					resolve();
				})
				.on('error', reject);
		});
	});
}

async function main() {
	try {
		const tripIds = await parseTrips();
		await importFilteredStopTimes(tripIds);
		console.log('Import complete.');
		db.close();
	} catch (err) {
		console.error('Error during import:', err);
	}
}

main();
