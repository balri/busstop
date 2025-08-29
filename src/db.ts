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
	routeId: string,
	startTime: string,
	endTime: string,
): Promise<{ trip_id: string; arrival_time: string }[]> {
	return new Promise((resolve, reject) => {
		db.all(
			`SELECT trip_id, arrival_time FROM stop_times
             WHERE stop_id = ?
             AND arrival_time BETWEEN ? AND ?
             AND trip_id IN (SELECT trip_id FROM trips WHERE route_id = ?)
			 ORDER BY arrival_time ASC`,
			[stopId, startTime, endTime, routeId],
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
