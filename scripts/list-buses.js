const axios = require("axios");
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");

const GTFS_RT_URL =
	"https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates";

// Set these to the stop and route you want to check:
const TARGET_STOP_ID = "3062";
const TARGET_ROUTE_ID = "61-4158"; // or your desired route

(async () => {
	try {
		const response = await axios.get(GTFS_RT_URL, {
			responseType: "arraybuffer",
		});
		const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
			new Uint8Array(response.data),
		);

		const arrivals = [];
		for (const entity of feed.entity) {
			if (
				entity.tripUpdate &&
				entity.tripUpdate.trip.routeId === TARGET_ROUTE_ID &&
				entity.tripUpdate.stopTimeUpdate
			) {
				for (const stopTimeUpdate of entity.tripUpdate.stopTimeUpdate) {
					if (stopTimeUpdate.stopId === TARGET_STOP_ID) {
						const arrival = stopTimeUpdate.arrival;
						const arrivalTime =
							arrival?.time != null
								? typeof arrival.time === "object" &&
									typeof arrival.time.toNumber === "function"
									? arrival.time.toNumber()
									: arrival.time
								: null;
						if (typeof arrivalTime === "number") {
							arrivals.push({
								tripId: entity.tripUpdate.trip.tripId,
								startDate: entity.tripUpdate.trip.startDate,
								arrivalTime,
								arrivalTimeStr: new Date(
									arrivalTime * 1000,
								).toLocaleString("en-AU", {
									hour: "2-digit",
									minute: "2-digit",
									second: "2-digit",
								}),
								delay: arrival?.delay ?? null,
							});
						}
					}
				}
			}
		}

		arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);

		console.log(
			`Upcoming buses for stop ${TARGET_STOP_ID} on route ${TARGET_ROUTE_ID}:`,
		);
		if (arrivals.length === 0) {
			console.log("No upcoming buses found.");
		} else {
			for (const bus of arrivals) {
				console.log(
					`Trip: ${bus.tripId}, Start: ${bus.startDate}, Arrival: ${bus.arrivalTimeStr}, Delay: ${bus.delay ?? "N/A"}s`,
				);
			}
		}
	} catch (e) {
		console.error("Failed to fetch or parse GTFS-RT feed:", e);
	}
})();
