import axios from "axios";
import express from "express";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

import { db } from "./db";
import { NearestStop, NextBus, StatusResponse, Stops } from "./types";
import { haversine, xorDecrypt } from "./utils";

const router = express.Router();
const GTFS_RT_URL =
	"https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates";
export const BUS_TOKEN = process.env["BUS_TOKEN"] || "bigjetplane";
export const TARGET_ROUTE_ID = "61-4158";

router.post("/status", async (req, res) => {
	const { loc } = req.body;

	let userLat, userLon;
	try {
		const decrypted = xorDecrypt(loc, BUS_TOKEN);
		const parsed = JSON.parse(decrypted);
		userLat = parseFloat(parsed.lat);
		userLon = parseFloat(parsed.lon);
	} catch (e) {
		console.error("Failed to parse location:", e);
		return res.status(400).json({ error: "Invalid coordinates" });
	}

	const minDistance = Number(process.env["MIN_DISTANCE"]) || 100;

	db.all(
		"SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops",
		async (err: Error | null, stops: Stops) => {
			if (err) return res.status(500).json({ error: "DB error" });

			let nearest: NearestStop | null = null;
			let minDist = Infinity;
			for (const stop of stops) {
				const dist = haversine(
					userLat,
					userLon,
					parseFloat(stop.stop_lat),
					parseFloat(stop.stop_lon),
				);
				if (dist < minDist) {
					minDist = dist;
					nearest = {
						stopId: stop.stop_id,
						stopName: stop.stop_name,
						stopLat: parseFloat(stop.stop_lat),
						stopLon: parseFloat(stop.stop_lon),
						distance: Math.round(dist),
					};
				}
			}

			if (!nearest) {
				return res.status(404).json({
					error: `No bus stop found`,
				});
			}

			const userIsNearEnough = minDist <= minDistance;

			const stopId = nearest.stopId;
			try {
				const response = await axios.get(GTFS_RT_URL, {
					responseType: "arraybuffer",
				});
				const feed =
					GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
						new Uint8Array(response.data),
					);
				const now = Math.floor(Date.now() / 1000);
				let nextBus: NextBus | null = null;

				const filteredEntities = feed.entity
					.filter(
						(entity) =>
							entity.tripUpdate &&
							entity.tripUpdate.trip.routeId ===
								TARGET_ROUTE_ID &&
							entity.tripUpdate.stopTimeUpdate?.some(
								(stopTimeUpdate) =>
									stopTimeUpdate.stopId === stopId,
							),
					)
					.map((entity) => ({
						id: entity.id,
						tripUpdate: {
							trip: entity.tripUpdate?.trip,
							stopTimeUpdate:
								entity.tripUpdate?.stopTimeUpdate?.filter(
									(stopTimeUpdate) =>
										stopTimeUpdate.stopId === stopId,
								),
						},
					}));

				const secretKeyword = process.env["SECRET_KEYWORD"] || null;
				const acceptableDelay =
					Number(process.env["ACCEPTABLE_DELAY"]) || 60;

				for (const entity of filteredEntities) {
					const trip = entity.tripUpdate.trip;
					for (const stopTimeUpdate of entity.tripUpdate
						.stopTimeUpdate || []) {
						const arrival = stopTimeUpdate.arrival;
						const arrivalTime =
							arrival?.time != null
								? typeof arrival.time === "object" &&
									typeof arrival.time.toNumber === "function"
									? arrival.time.toNumber()
									: arrival.time
								: null;
						if (
							typeof arrivalTime !== "number" ||
							arrivalTime < now - 60
						)
							continue;

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

				if (nextBus && nextBus.tripId) {
					const scheduledTime =
						nextBus.arrivalTime - (nextBus.delay ?? 0);
					let status = "on_time";
					const now = Math.floor(Date.now() / 1000);

					if (
						typeof nextBus.delay === "number" &&
						nextBus.delay > acceptableDelay
					) {
						status = "late";
					} else if (
						typeof nextBus.delay === "number" &&
						nextBus.delay < -acceptableDelay
					) {
						status = "early";
					}

					const response: StatusResponse = {
						status,
						scheduledTime,
						estimatedTime: nextBus.arrivalTime,
						delay: nextBus.delay,
						nearest: nearest,
					};

					// Only return keyword if within 1 minute of arrival time
					// and the user is near enough
					if (
						userIsNearEnough &&
						nextBus.arrivalTime &&
						Math.abs(now - nextBus.arrivalTime) <= 60
					) {
						response.keyword = secretKeyword;
					}

					res.json(response);
					return;
				} else {
					console.log("No service found for stop", stopId);
					res.json({ status: "no_service" });
					return;
				}
			} catch (e) {
				console.error("Failed to fetch GTFS-RT feed:", e);
				res.status(500).json({ error: "Failed to fetch GTFS-RT feed" });
				return;
			}
		},
	);
	return;
});

export default router;
