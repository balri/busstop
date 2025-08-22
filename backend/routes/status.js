const express = require('express');
const axios = require('axios');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const { db, getScheduledTime } = require('../db');
const { haversine, xorDecrypt, scheduledTimeToUnix } = require('../utils');
const { validateToken } = require('../tokens');

const router = express.Router();
const GTFS_RT_URL = 'https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates';
const TARGET_ROUTE_ID = '61-4158';

router.post('/status', async (req, res) => {
	const { loc, token } = req.body;
	if (!validateToken(token)) {
		return res.status(403).json({ error: 'Invalid or expired token' });
	}

	let userLat, userLon;
	try {
		const decrypted = xorDecrypt(loc, token);
		const parsed = JSON.parse(decrypted);
		userLat = parseFloat(parsed.lat);
		userLon = parseFloat(parsed.lon);
	} catch (e) {
		return res.status(400).json({ error: 'Invalid coordinates' });
	}

	const minDistance = process.env.MIN_DISTANCE || 100;

	db.all('SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops', async (err, stops) => {
		if (err) return res.status(500).json({ error: 'DB error' });

		let nearest = null;
		let minDist = Infinity;
		for (const stop of stops) {
			const dist = haversine(userLat, userLon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
			if (dist < minDist) {
				minDist = dist;
				nearest = {
					stopId: stop.stop_id,
					stopName: stop.stop_name,
					stopLat: stop.stop_lat,
					stopLon: stop.stop_lon,
					distance: Math.round(dist)
				};
			}
		}

		if (!nearest || minDist > minDistance) {
			return res.status(404).json({
				error: `No bus stop within ${minDistance}m`,
				nearest: nearest
					? nearest
					: null
			});
		}

		const stopId = nearest.stopId;
		try {
			const response = await axios.get(GTFS_RT_URL, { responseType: 'arraybuffer' });
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
					const arrival = stopTimeUpdate.arrival;
					const arrivalTime = arrival?.time?.toNumber?.() ?? null;
					if (!arrivalTime || arrivalTime < now) continue;
					if (!nextBus || arrivalTime < nextBus.arrivalTime) {
						nextBus = {
							tripId: trip.tripId,
							startDate: trip.startDate,
							arrivalTime,
							delay: arrival?.delay ?? null,
							uncertainty: arrival?.uncertainty ?? null
						};
					}
				}
			}

			const secretKeyword = process.env.SECRET_KEYWORD || null;
			const acceptableDelay = process.env.ACCEPTABLE_DELAY || 60;

			if (nextBus) {
				getScheduledTime(nextBus.tripId, stopId)
					.then(scheduledStr => {
						let scheduledTime = null;
						if (scheduledStr) {
							scheduledTime = scheduledTimeToUnix(nextBus.startDate, scheduledStr);
						}
						let status = 'on_time';
						const now = Math.floor(Date.now() / 1000);

						if (nextBus.delay > acceptableDelay) {
							status = 'late';
						} else if (nextBus.delay < -acceptableDelay) {
							status = 'early';
						}

						const response = {
							status,
							scheduledTime,
							estimatedTime: nextBus.arrivalTime,
							delay: nextBus.delay,
							stopName: nearest.stopName,
						};

						// Only return keyword if within 1 minute of arrival time
						const uncertainty = nextBus.uncertainty || 30;
						if (
							nextBus.arrivalTime &&
							Math.abs(now - nextBus.arrivalTime) <= uncertainty
						) {
							response.keyword = secretKeyword;
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

module.exports = router;
