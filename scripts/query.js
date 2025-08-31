const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(path.resolve(process.cwd()), "gtfs.db");

// const sql = "SELECT name FROM sqlite_master WHERE type='table'";
const sql = `
	SELECT *
	FROM trips
	JOIN stop_times ON trips.trip_id = stop_times.trip_id
	JOIN stops ON stop_times.stop_id = stops.stop_id
	JOIN services ON trips.service_id = services.service_id
	WHERE stops.stop_name = 'Logan Rd at Lewis Street, stop 11'
	AND services.sunday = 1
	AND services.start_date <= '20250831'
	AND services.end_date >= '20250831'
	AND stop_times.arrival_time > '11:18:00'
	AND stop_times.arrival_time < '11:48:00'
	AND '20250831' NOT IN (
		SELECT date
		FROM service_dates
		WHERE service_id = services.service_id
		AND exception_type = 2
	)
		ORDER BY stop_times.arrival_time
		LIMIT 1
`;

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		console.error("Could not connect to database", err);
		process.exit(1);
	}
});

db.all(sql, (err, rows) => {
	if (err) {
		console.error("Query error:", err);
	} else {
		console.log(rows);
	}
	db.close();
});
