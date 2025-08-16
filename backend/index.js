const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const { DateTime } = require('luxon');
const { generatePlotHtml } = require('./plot_delays');
const crypto = require('crypto');
const tokens = new Set();

// Stub GTFS-RT feed URL
const GTFS_RT_URL = 'https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates';

// Hard-coded route and stop
const TARGET_ROUTE_ID = '61-4158';

const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database(path.join(__dirname, 'gtfs.db'));

function getScheduledTime(tripId, stopId) {
	return new Promise((resolve, reject) => {
		db.get(
			'SELECT arrival_time FROM stop_times WHERE trip_id = ? AND stop_id = ?',
			[tripId, stopId],
			(err, row) => {
				if (err) return reject(err);
				resolve(row ? row.arrival_time : null);
			}
		);
	});
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

// Haversine formula to calculate distance in meters
function haversine(lat1, lon1, lat2, lon2) {
	const R = 6371000; // Earth radius in meters
	const toRad = deg => deg * Math.PI / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function xorDecrypt(encoded, key) {
	const text = Buffer.from(encoded, 'base64').toString('binary');
	let result = '';
	for (let i = 0; i < text.length; i++) {
		result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
	}
	return result;
}

app.use(express.json()); // Add this near the top, after express()

app.post('/status', async (req, res) => {
	const { loc, token } = req.body;
	if (!tokens.has(token)) {
		return res.status(403).json({ error: 'Invalid or missing token' });
	}
	tokens.delete(token);

	let userLat, userLon;
	try {
		const decrypted = xorDecrypt(loc, token);
		const parsed = JSON.parse(decrypted);
		userLat = parseFloat(parsed.lat);
		userLon = parseFloat(parsed.lon);
	} catch (e) {
		return res.status(400).json({ error: 'Invalid coordinates' });
	}

	const minDistance = process.env.MIN_DISTANCE || 100; // meters

	db.all('SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops', async (err, stops) => {
		if (err) return res.status(500).json({ error: 'DB error' });

		let nearest = null;
		let minDist = Infinity;
		for (const stop of stops) {
			const dist = haversine(userLat, userLon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
			if (dist < minDist) {
				minDist = dist;
				nearest = stop;
			}
		}

		if (!nearest || minDist > minDistance) {
			return res.status(404).json({ error: `No bus stop within ${minDistance}m` });
		}

		const stopId = nearest.stop_id;
		try {
			const response = await axios.get(GTFS_RT_URL, {
				responseType: 'arraybuffer',
			});
			const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
				new Uint8Array(response.data)
			);
			const now = Math.floor(Date.now() / 1000);
			let nextBus = null;

			const filteredEntities = feed.entity
				.filter(entity =>
					entity.tripUpdate &&
					entity.tripUpdate.trip.routeId === TARGET_ROUTE_ID &&
					entity.tripUpdate.stopTimeUpdate.some(
						stopTimeUpdate => stopTimeUpdate.stopId === stopId
					)
				)
				.map(entity => ({
					id: entity.id,
					tripUpdate: {
						trip: entity.tripUpdate.trip,
						stopTimeUpdate: entity.tripUpdate.stopTimeUpdate.filter(
							stopTimeUpdate => stopTimeUpdate.stopId === stopId
						)
					}
				}));

			for (const entity of filteredEntities) {
				const trip = entity.tripUpdate.trip;

				for (const stopTimeUpdate of entity.tripUpdate.stopTimeUpdate) {
					const arrivalTime = stopTimeUpdate.arrival?.time?.toNumber?.() ?? null;
					if (!arrivalTime || arrivalTime < now) continue;
					if (!nextBus || arrivalTime < nextBus.arrivalTime) {
						nextBus = {
							tripId: trip.tripId,
							startDate: trip.startDate,
							arrivalTime,
							delay: stopTimeUpdate.arrival?.delay ?? null,
						};
					}
				}
			}

			const secretMsg = process.env.SECRET_KEYWORD || null;
			const acceptableDelay = process.env.ACCEPTABLE_DELAY || 60; // seconds

			if (nextBus) {
				getScheduledTime(nextBus.tripId, stopId)
					.then(scheduledStr => {
						let scheduledTime = null;
						if (scheduledStr) {
							scheduledTime = scheduledTimeToUnix(nextBus.startDate, scheduledStr);
						}
						let status = 'on_time';
						let secretMessage = null;
						if (nextBus.delay > acceptableDelay) {
							status = 'late';
						} else if (nextBus.delay < -acceptableDelay) {
							status = 'early';
							// secretMessage = secretMsg;
						} else {
							secretMessage = secretMsg;
						}

						const response = {
							status,
							scheduledTime,
							estimatedTime: nextBus.arrivalTime,
							delay: nextBus.delay,
							stopName: nearest.stop_name,
						};

						if (secretMessage) {
							response.secretMessage = secretMessage;
						}

						return res.json(response);
					})
					.catch(() => res.status(500).json({ error: 'DB error' }));
			} else {
				return res.json({ status: 'no_service' });
			}
		} catch (e) {
			return res.status(500).json({ error: 'Failed to fetch GTFS-RT feed' });
		}
	});
});

app.get('/health', (req, res) => {
	res.status(200).send('OK');
});

// Add this above `app.listen(...)`
app.use(express.static(path.join(__dirname, '../public')));

// Serve bus_delay_plot.html at /plot
app.get('/plot', (req, res) => {
	generatePlotHtml((err, html) => {
		if (err) {
			res.status(500).send('Error generating plot');
		} else {
			res.set('Content-Type', 'text/html');
			res.send(html);
		}
	});
});

// Serve index.html with a token
app.get('/', (req, res) => {
	const token = crypto.randomBytes(16).toString('hex');
	tokens.add(token);
	fs.readFile(path.join(__dirname, '../public/index.template.html'), 'utf8', (err, html) => {
		if (err) return res.status(500).send('Error loading page');
		const htmlWithToken = html.replace('</head>', `<script>window.BUS_TOKEN="${token}"</script></head>`);
		res.send(htmlWithToken);
	});
});

app.listen(PORT, () => {
	console.log(`Backend listening on port ${PORT}`);
});
