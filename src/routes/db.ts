import { DateTime } from "luxon";
import path from "path";
import sqlite3 from "sqlite3";

export const db = new sqlite3.Database(path.join(process.cwd(), "gtfs.db"));

export function getScheduledTime(
	tripId: string,
	stopId: string,
): Promise<string | null> {
	return new Promise((resolve, reject) => {
		db.get(
			"SELECT arrival_time FROM stop_times WHERE trip_id = ? AND stop_id = ?",
			[tripId, stopId],
			(err: Error | null, row: { arrival_time: string } | undefined) => {
				if (err) return reject(err);
				resolve(row ? row.arrival_time : null);
			},
		);
	});
}

export function getScheduledArrivalsForStop(
	stopId: string,
	windowSeconds: number,
): Promise<{ trip_id: string; arrival_time: string }[]> {
	return new Promise((resolve, reject) => {
		const today = DateTime.now().setZone("Australia/Brisbane");
		const dow = today.weekdayLong?.toLowerCase() ?? "monday";
		const todayStr = today.toFormat("yyyyLLdd");
		const startTime = today.minus({ seconds: 60 }).toFormat("HH:mm:ss");
		const endTime = today
			.plus({ seconds: windowSeconds })
			.toFormat("HH:mm:ss");
		db.all(
			`
				SELECT trips.trip_id, stop_times.arrival_time
				FROM trips
				JOIN stop_times ON trips.trip_id = stop_times.trip_id
				JOIN services ON trips.service_id = services.service_id
				WHERE stop_times.stop_id = ?
				AND services.` +
				dow +
				` = 1
				AND services.start_date <= ?
				AND services.end_date >= ?
				AND stop_times.arrival_time > ?
				AND stop_times.arrival_time < ?
				AND ? NOT IN (
					SELECT date
					FROM service_dates
					WHERE service_id = services.service_id
					AND exception_type = 2
				)
				ORDER BY stop_times.arrival_time
			`,
			[stopId, todayStr, todayStr, startTime, endTime, todayStr],
			(
				err: Error | null,
				rows: { trip_id: string; arrival_time: string }[] | undefined,
			) => {
				if (err) return reject(err);
				resolve(rows || []);
			},
		);
	});
}
