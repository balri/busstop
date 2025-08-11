const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'busdata.db'));

// Group delays into minute bands and count
db.all(
	`SELECT CASE
			WHEN delay_seconds < 180 THEN '0-3 min'
			WHEN delay_seconds < 600 THEN '4-10 min'
			ELSE '+10 min'
		END AS minute_band,
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
