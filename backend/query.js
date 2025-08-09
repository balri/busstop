const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'busdata.db'));

// Group delays into minute bands and count
db.all(
	`SELECT
        CAST(delay_seconds / 300 AS INTEGER) AS minute_band,
        COUNT(*) AS count
    FROM bus_checks
    GROUP BY minute_band
    ORDER BY minute_band`,
	(err, rows) => {
		if (err) {
			console.error('Error querying database:', err);
		} else {
			console.log('Results:', rows);
		}
		db.close();
	}
);
