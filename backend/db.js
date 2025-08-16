const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'gtfs.db'));

function getScheduledTime(tripId, stopId) {
	return new Promise((resolve, reject) => {
		db.get(
			'SELECT arrival_time FROM stop_times WHERE trip_id = ? AND stop_id = ?',
			[tripId, stopId],
			(err, row) => {
				if (err) return reject(err);
				resolve(row ? row.arrival_time : null);
			}
		);
	});
}

module.exports = { db, getScheduledTime };
