const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(path.resolve(process.cwd()), "gtfs.db");

// const sql = "SELECT name FROM sqlite_master WHERE type='table'";
const sql = `
	SELECT stops.stop_id, stop_name, stop_lat, stop_lon
		FROM stops
		JOIN stop_directions ON stops.stop_id = stop_directions.stop_id
		WHERE direction_id = ?
`;

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		console.error("Could not connect to database", err);
		process.exit(1);
	}
});

db.all(sql, [1], (err, rows) => {
	if (err) {
		console.error("Query error:", err);
	} else {
		console.log(rows);
	}
	db.close();
});
