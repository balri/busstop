const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const { DateTime } = require('luxon');

// Stub GTFS-RT feed URL
const GTFS_RT_URL = 'https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates';

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

		const filteredEntities = feed.entity
			.filter(entity =>
				entity.tripUpdate &&
				entity.tripUpdate.trip.routeId === TARGET_ROUTE_ID &&
				entity.tripUpdate.stopTimeUpdate.some(
					stopTimeUpdate => stopTimeUpdate.stopId === TARGET_STOP_ID
				)
			)
			.map(entity => ({
				id: entity.id,
				tripUpdate: {
					trip: entity.tripUpdate.trip,
					stopTimeUpdate: entity.tripUpdate.stopTimeUpdate.filter(
						stopTimeUpdate => stopTimeUpdate.stopId === TARGET_STOP_ID
					)
				}
			}));

		for (const entity of filteredEntities) {
			const trip = entity.tripUpdate.trip;

			for (const stopTimeUpdate of entity.tripUpdate.stopTimeUpdate) {
				const arrivalTime = stopTimeUpdate.arrival?.time?.toNumber?.() ?? null;
				if (!arrivalTime || arrivalTime < now) continue; // skip past arrivals

				if (!nextBus || arrivalTime < nextBus.arrivalTime) {
					nextBus = {
						tripId: trip.tripId,
						startDate: trip.startDate,
						arrivalTime,
						delay: stopTimeUpdate.arrival?.delay ?? null,
						uncertainty: stopTimeUpdate.arrival?.uncertainty ?? 0,
					};
				}
			}
		}

		const secretMsg = process.env.SECRET_KEYWORD || null;
		const acceptableDelay = process.env.ACCEPTABLE_DELAY || 60; // seconds

		if (nextBus) {
			// Get scheduled time from JSON
			const scheduledStr = getScheduledTime(nextBus.tripId);

			let scheduledTime = null;
			if (scheduledStr) {
				scheduledTime = scheduledTimeToUnix(nextBus.startDate, scheduledStr);
			}

			let status = 'on_time';
			let secretMessage = null;

			const maxArrivalTime = nextBus.arrivalTime + nextBus.uncertainty;
			const minArrivalTime = nextBus.arrivalTime - nextBus.uncertainty;

			if (minArrivalTime > (scheduledTime + acceptableDelay)) {
				status = 'late';
			} else if (maxArrivalTime < (scheduledTime - acceptableDelay)) {
				status = 'early';
			} else {
				secretMessage = secretMsg;
			}

			const response = {
				status,
				scheduledTime: scheduledTime,
				estimatedTime: nextBus.arrivalTime,
				tripId: nextBus.tripId,
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
