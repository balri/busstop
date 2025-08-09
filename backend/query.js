const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'busdata.db'));

// Example: Query all rows from bus_checks
db.all('SELECT AVG(delay_seconds) / 60 as delay_min FROM bus_checks', (err, rows) => {
	if (err) {
		console.error('Error querying database:', err);
	} else {
		console.log('Results:', rows);
	}
	db.close();
});
