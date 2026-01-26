import axios from "axios";
import express from "express";
import fs from "fs";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { DateTime } from "luxon";
import path from "path";

import { NearestStop, NextBus, StatusResponse, Stops } from "./types";
import { haversine, xorDecrypt } from "./utils";

const router = express.Router();
const GTFS_RT_URL =
	"https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates";
export const BUS_TOKEN = "f2d10fe4-45df-4463-8bf9-86aa475b1402";

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
	const now = DateTime.utc().setZone("Australia/Brisbane");
	const direction = now.hour < 12 ? 1 : 0; // 0 = outbound, 1 = inbound

	const stopsPath = path.join(process.cwd(), "stops.json");
	let stops: Stops;
	try {
		stops = JSON.parse(fs.readFileSync(stopsPath, "utf8"));
	} catch (err) {
		console.error("Failed to load stops:", err);
		return res.status(500).json({ error: "Failed to load stops" });
	}

	// Filter stops by direction if needed
	const filteredStops = stops.filter(
		(stop) => stop.direction_id === direction,
	);

	let nearest: NearestStop | null = null;
	let minDist = Infinity;
	for (const stop of filteredStops) {
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
				routeId: stop.route_id,
				routeIds: stop.route_ids,
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
	const routeIdsToCheck = Array.isArray(nearest.routeIds)
		? nearest.routeIds
		: [nearest.routeId];
	let foundService = false;
	let nextBus: NextBus | null = null;
	let foundRouteId: string | null = null;
	try {
		const response = await axios.get(GTFS_RT_URL, {
			responseType: "arraybuffer",
		});
		const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
			new Uint8Array(response.data),
		);
		const now = Math.floor(Date.now() / 1000);
		const secretKeyword = process.env["SECRET_KEYWORD"] || null;
		const acceptableDelay = Number(process.env["ACCEPTABLE_DELAY"]) || 60;

		for (const routeId of routeIdsToCheck) {
			const filteredEntities = feed.entity
				.filter(
					(entity) =>
						entity.tripUpdate &&
						entity.tripUpdate.trip.routeId === routeId &&
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

			for (const entity of filteredEntities) {
				const trip = entity.tripUpdate.trip;
				for (const stopTimeUpdate of entity.tripUpdate.stopTimeUpdate ||
					[]) {
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
						foundRouteId = routeId;
						foundService = true;
					}
				}
			}
			if (foundService) break;
		}

		if (nextBus && nextBus.tripId) {
			const scheduledTime = nextBus.arrivalTime - (nextBus.delay ?? 0);
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
				nearest: {
					...nearest,
					routeId: foundRouteId || nearest.routeId,
				},
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
});

export default router;
