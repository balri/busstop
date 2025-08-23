import express from 'express';
import axios from 'axios';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { db, getScheduledTime } from '../db';
import { haversine, xorDecrypt, scheduledTimeToUnix } from '../utils';
import { validateToken } from '../tokens';
import { NearestStop, NextBus, StatusResponse, Stops } from './types';

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
		console.error('Failed to parse location:', e);
		return res.status(400).json({ error: 'Invalid coordinates' });
	}

	const minDistance = Number(process.env.MIN_DISTANCE) || 100;

	db.all('SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops', async (err: Error | null, stops: Stops) => {
		if (err) return res.status(500).json({ error: 'DB error' });

		let nearest: NearestStop | null = null;
		let minDist = Infinity;
		for (const stop of stops) {
			const dist = haversine(userLat, userLon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
			if (dist < minDist) {
				minDist = dist;
				nearest = {
					stopId: stop.stop_id,
					stopName: stop.stop_name,
					stopLat: parseFloat(stop.stop_lat),
					stopLon: parseFloat(stop.stop_lon),
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
			let nextBus: NextBus | null = null;

			const filteredEntities = feed.entity
				.filter(entity =>
					entity.tripUpdate &&
					entity.tripUpdate.trip.routeId === TARGET_ROUTE_ID &&
					entity.tripUpdate.stopTimeUpdate?.some(
						stopTimeUpdate => stopTimeUpdate.stopId === stopId
					)
				)
				.map(entity => ({
					id: entity.id,
					tripUpdate: {
						trip: entity.tripUpdate?.trip,
						stopTimeUpdate: entity.tripUpdate?.stopTimeUpdate?.filter(
							stopTimeUpdate => stopTimeUpdate.stopId === stopId
						)
					}
				}));

			for (const entity of filteredEntities) {
				const trip = entity.tripUpdate.trip;
				for (const stopTimeUpdate of entity.tripUpdate.stopTimeUpdate || []) {
					const arrival = stopTimeUpdate.arrival;
					const arrivalTime = arrival?.time != null
						? (typeof arrival.time === 'object' && typeof arrival.time.toNumber === 'function'
							? arrival.time.toNumber()
							: arrival.time)
						: null;
					if (typeof arrivalTime !== 'number' || arrivalTime < now) continue;
					if (!nextBus || arrivalTime < nextBus.arrivalTime) {
						nextBus = {
							tripId: trip?.tripId ?? undefined,
							startDate: trip?.startDate ?? undefined,
							arrivalTime,
							delay: arrival?.delay ?? null,
						};
					}
				}
			}

			const secretKeyword = process.env.SECRET_KEYWORD || null;
			const acceptableDelay = Number(process.env.ACCEPTABLE_DELAY) || 60;

			if (nextBus && nextBus.tripId) {
				getScheduledTime(nextBus.tripId, stopId)
					.then(scheduledStr => {
						let scheduledTime = null;
						if (scheduledStr && typeof nextBus.startDate === 'string') {
							scheduledTime = scheduledTimeToUnix(nextBus.startDate, scheduledStr);
						}
						let status = 'on_time';
						const now = Math.floor(Date.now() / 1000);

						if (typeof nextBus.delay === 'number' && nextBus.delay > acceptableDelay) {
							status = 'late';
						} else if (typeof nextBus.delay === 'number' && nextBus.delay < -acceptableDelay) {
							status = 'early';
						}

						const response: StatusResponse = {
							status,
							scheduledTime,
							estimatedTime: nextBus.arrivalTime,
							delay: nextBus.delay,
							stopName: nearest.stopName,
						};

						// Only return keyword if within 1 minute of arrival time
						if (
							nextBus.arrivalTime &&
							Math.abs(now - nextBus.arrivalTime) <= 60
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
			console.error('Failed to fetch GTFS-RT feed:', e);
			return res.status(500).json({ error: 'Failed to fetch GTFS-RT feed' });
		}
	});
});

export default router;
