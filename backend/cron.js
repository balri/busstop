// backend/cron.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

// Stub GTFS-RT feed URL
const GTFS_RT_URL = 'https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates'; // Replace with actual URL

// Hard-coded route and stop
const TARGET_ROUTE_ID = '61-4158';
const TARGET_STOP_ID = '3054';

// === DATABASE SETUP ===
const db = new sqlite3.Database(path.join(__dirname, 'busdata.db'));
db.run(`
  CREATE TABLE IF NOT EXISTS bus_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT,
    delay_seconds INTEGER
  )
`);

function saveResult(status, delay) {
	db.run(
		`INSERT INTO bus_checks (status, delay_seconds) VALUES (?, ?)`,
		[status, delay],
		err => {
			if (err) console.error('DB insert error:', err);
		}
	);
}

// === MAIN CHECK FUNCTION ===
async function checkBus() {
	try {
		const res = await fetch(GTFS_RT_URL);
		const buffer = await res.arrayBuffer();

		// Parse GTFS Realtime
		const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
			new Uint8Array(buffer)
		);

		const now = Math.floor(Date.now() / 1000); // Current time in seconds
		let nextBus = null;

		for (const entity of feed.entity) {
			if (!entity.tripUpdate) continue;
			const trip = entity.tripUpdate.trip;

			if (trip.routeId !== TARGET_ROUTE_ID) continue;

			for (const stopTimeUpdate of entity.tripUpdate.stopTimeUpdate) {
				if (stopTimeUpdate.stopId !== TARGET_STOP_ID) continue;

				const arrivalTime = stopTimeUpdate.arrival?.time?.toNumber?.() ?? null;
				if (!arrivalTime || arrivalTime < now) continue; // skip past arrivals

				if (!nextBus || arrivalTime < nextBus.arrivalTime) {
					nextBus = {
						tripId: trip.tripId,
						startDate: trip.startDate,
						arrivalTime,
						delay: stopTimeUpdate.arrival?.delay ?? null
					};
				}
			}
		}

		if (nextBus) {
			const delay = nextBus.delay || 0;
			let status = 'on_time';
			if (delay > 60) {
				status = 'late';
			} else if (delay < -60) {
				status = 'early';
			}
			saveResult(status, delay);
			console.log(`Next bus ${nextBus.tripId} arriving at ${new Date(nextBus.arrivalTime * 1000)} with delay of ${delay} seconds (${status})`);
		} else {
			console.log("No upcoming buses found");
		}
	} catch (err) {
		console.error('Error checking bus:', err);
	}
}

// Run once when script is called
checkBus();
