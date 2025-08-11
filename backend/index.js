const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const { DateTime } = require('luxon');

// Stub GTFS-RT feed URL
const GTFS_RT_URL = 'https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates'; // Replace with actual URL

// Hard-coded route and stop
const TARGET_ROUTE_ID = '61-4158';
const TARGET_STOP_ID = '3054';

const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database(path.join(__dirname, 'busdata.db'));

// Load stop_times_filtered.json once at startup
const stopTimes = JSON.parse(
	fs.readFileSync(path.join(__dirname, 'stop_times_filtered.json'), 'utf8')
);

function getScheduledTime(tripId) {
	const entry = stopTimes.find(
		(row) => row.trip_id === tripId
	);
	return entry ? entry.arrival_time : null;
}

function scheduledTimeToUnix(startDate, scheduledTime) {
	// startDate is a string like 'YYYYMMDD' e.g. '20250809'
	const year = +startDate.substring(0, 4);
	const month = +startDate.substring(4, 6);
	const day = +startDate.substring(6, 8);

	const [hours, minutes, seconds] = scheduledTime.split(':').map(Number);

	// Use AEST (Australia/Brisbane) timezone
	const dt = DateTime.fromObject(
		{ year, month, day, hour: hours, minute: minutes, second: seconds },
		{ zone: 'Australia/Brisbane' }
	);
	return Math.floor(dt.toSeconds());
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

		const secretMsg = process.env.SECRET_KEYWORD || null;
		const acceptableDelay = process.env.ACCEPTABLE_DELAY || 60; // seconds

		if (nextBus) {
			// Get scheduled time from JSON
			const scheduledStr = getScheduledTime(nextBus.tripId);

			let scheduledTimeUnix = null;
			if (scheduledStr) {
				scheduledTimeUnix = scheduledTimeToUnix(nextBus.startDate, scheduledStr);
			}

			const delay = nextBus.delay || 0;
			let status = 'on_time';
			let secretMessage = null;

			if (delay > acceptableDelay) {
				status = 'late';
			} else if (delay < 0) {
				status = 'early';
				secretMessage = secretMsg;
			} else {
				secretMessage = secretMsg;
			}

			const response = {
				status,
				scheduledTime: scheduledTimeUnix,
				estimatedTime: nextBus.arrivalTime,
			};

			if (secretMessage) {
				response.secretMessage = secretMessage;
			}

			res.json(response);
		} else {
			res.json({ status: 'cancelled' });
		}

	} catch (err) {
		console.error(err);
		res.status(500).send('Error retrieving bus status.');
	}
});

app.get('/health', (req, res) => {
	res.status(200).send('OK');
});

// Add this above `app.listen(...)`
app.use(express.static(path.join(__dirname, '../public')));

app.listen(PORT, () => {
	console.log(`Backend listening on port ${PORT}`);
});
