import sqlite3 from 'sqlite3';
import path from 'path';

export const db = new sqlite3.Database(path.join(process.cwd(), 'gtfs.db'));

export function getScheduledTime(tripId: string, stopId: string): Promise<string | null> {
	return new Promise((resolve, reject) => {
		db.get(
			'SELECT arrival_time FROM stop_times WHERE trip_id = ? AND stop_id = ?',
			[tripId, stopId],
			(err: Error | null, row: { arrival_time: string } | undefined) => {
				if (err) return reject(err);
				resolve(row ? row.arrival_time : null);
			}
		);
	});
}
