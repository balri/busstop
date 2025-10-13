// checkFeed.js
const axios = require("axios");
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");

const GTFS_RT_URL =
	"https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates";

async function checkFeed() {
	try {
		const res = await axios.get(GTFS_RT_URL, {
			responseType: "arraybuffer",
		});
		const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
			new Uint8Array(res.data),
		);

		const nowSec = Math.floor(Date.now() / 1000);
		const lag = feed.header.timestamp
			? nowSec - feed.header.timestamp
			: null;

		if (lag && lag > 600) {
			console.log(`⚠️ Feed is stale. Last updated ${lag} seconds ago.`);
		} else if (!feed.entity?.length) {
			console.log("⚠️ Feed is empty — no entities present.");
		} else {
			console.log(
				`✅ Feed OK. ${feed.entity.length} trip updates received.`,
			);
		}
	} catch (err) {
		console.error("❌ Feed request failed:", err.message);
	}
}

checkFeed();
