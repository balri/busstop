import fs from "fs";
import fetch from "node-fetch";
import unzipper from "unzipper";

import { importRoutes } from "./routes";
import { importServiceDates } from "./service_dates";
import { importServices } from "./services";
import { importStopDirections } from "./stop_directions";
import { importStopTimes } from "./stop_times";
import { createJsonStops, importStops } from "./stops";
import { importTrips } from "./trips";
import { GTFS_DIR, GTFS_URL } from "./types";

async function downloadAndExtractGTFS() {
	// Remove and recreate feeds directory
	if (fs.existsSync(GTFS_DIR)) {
		fs.rmSync(GTFS_DIR, { recursive: true, force: true });
	}
	fs.mkdirSync(GTFS_DIR);

	console.log("Downloading GTFS zip...");
	const response = await fetch(GTFS_URL);
	if (!response.ok)
		throw new Error(`Failed to download GTFS: ${response.statusText}`);
	const zipStream = response.body;

	if (!zipStream) {
		throw new Error("Response body is null. Failed to get zip stream.");
	}

	console.log("Extracting GTFS zip...");
	await new Promise((resolve, reject) => {
		zipStream
			.pipe(unzipper.Extract({ path: GTFS_DIR }))
			.on("close", resolve)
			.on("error", reject);
	});
	console.log("GTFS feed downloaded and extracted.");
}

async function main() {
	try {
		await downloadAndExtractGTFS();

		// Note: order matters due to foreign key constraints
		await importRoutes();
		await importTrips();
		await importStopTimes();
		await importStops();
		await importStopDirections();
		await importServices();
		await importServiceDates();
		await createJsonStops();
		console.log("\n✅ All import functions completed successfully.");
	} catch (err) {
		console.error("❌ Error running filter scripts:", err);
		process.exit(1);
	}
}

main().then(() => process.exit(0));
