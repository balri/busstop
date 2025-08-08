const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

// Stub GTFS-RT feed URL
const GTFS_RT_URL = 'https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates'; // Replace with actual URL

// Hard-coded route and stop
const TARGET_ROUTE_ID = '61-4158';
const TARGET_STOP_ID = '3054';

const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database(path.join(__dirname, 'busdata.db'));

function getScheduledTime(tripId, stopId) {
	return new Promise((resolve, reject) => {
		db.get(
			`SELECT arrival_time FROM stop_times_filtered WHERE trip_id = ? AND stop_id = ?`,
			[tripId, stopId],
			(err, row) => {
				if (err) return reject(err);
				if (!row) return resolve(null);
				resolve(row.arrival_time);
			}
		);
	});
}

function scheduledTimeToUnix(startDate, scheduledTime) {
	// startDate is a string like 'YYYYMMDD' e.g. '20250809'
	const year = +startDate.substring(0, 4);
	const month = +startDate.substring(4, 6) - 1; // zero-based month
	const day = +startDate.substring(6, 8);

	const [hours, minutes, seconds] = scheduledTime.split(':').map(Number);

	const date = new Date(year, month, day, hours, minutes, seconds);
	return Math.floor(date.getTime() / 1000);
}

app.get('/status', async (req, res) => {
	try {
		const response = await axios.get(GTFS_RT_URL, {
			responseType: 'arraybuffer',
		});

		const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
			new Uint8Array(response.data)
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
			// Get scheduled time from SQLite DB
			const scheduledStr = await getScheduledTime(nextBus.tripId, TARGET_STOP_ID);

			let scheduledTimeUnix = null;
			if (scheduledStr) {
				scheduledTimeUnix = scheduledTimeToUnix(nextBus.startDate, scheduledStr);
			}

			let status = 'on_time';
			if (nextBus.delay > 60) {
				status = 'late';
			} else if (nextBus.delay < -60) {
				status = 'early';
			}

			return res.json({
				status,
				scheduledTime: scheduledTimeUnix,
				estimatedTime: nextBus.arrivalTime,
			});
		} else {
			return res.json({ status: 'cancelled' });
		}
	} catch (err) {
		console.error(err);
		res.status(500).send('Error retrieving bus status.');
	}
});

app.get('/stats', (req, res) => {
	db.all(
		`SELECT status, COUNT(*) as count FROM bus_checks GROUP BY status`,
		(err, rows) => {
			if (err) {
				console.error(err);
				return res.status(500).send('DB error');
			}

			// Format result into { early: x, on_time: y, late: z }
			const stats = { early: 0, on_time: 0, late: 0 };
			rows.forEach(r => {
				stats[r.status] = r.count;
			});

			res.json(stats);
		}
	);
});

app.listen(PORT, () => {
	console.log(`Backend listening on port ${PORT}`);
});

// Add this above `app.listen(...)`
app.use(express.static(path.join(__dirname, '../public')));
