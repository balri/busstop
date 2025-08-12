const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function median(arr) {
	if (arr.length === 0) return null;
	const sorted = arr.slice().sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

function generatePlotHtml(callback) {
	const db = new sqlite3.Database(path.join(__dirname, 'busdata.db'));

	db.all(
		`SELECT
            datetime(timestamp, '+10 hours') AS aest_time,
            delay_seconds,
            strftime('%w', datetime(timestamp, '+10 hours')) AS day_of_week,
            strftime('%H', datetime(timestamp, '+10 hours')) AS hour
        FROM bus_checks
        ORDER BY timestamp ASC`,
		(err, rows) => {
			if (err) {
				callback(err);
				db.close();
				return;
			}

			const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

			// Calculate stats: avg and median delay for each (day, 3-hour period)
			const stats = {};
			for (const row of rows) {
				const day = days[Number(row.day_of_week)];
				const hour = Number(row.hour);
				const periodStart = Math.floor(hour / 3) * 3;
				const periodEnd = periodStart + 3;
				const period = `${String(periodStart).padStart(2, '0')}:00-${String(periodEnd).padStart(2, '0')}:00`;
				const key = `${day} ${period}`;
				if (!stats[key]) stats[key] = [];
				stats[key].push(row.delay_seconds);
			}

			const statsTableRows = Object.entries(stats).map(([key, delays]) => {
				const avg = (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1);
				const med = median(delays).toFixed(1);
				return `<tr><td>${key}</td><td>${avg}</td><td>${med}</td><td>${delays.length}</td></tr>`;
			}).join('\n');

			const traces = days.map((day, idx) => {
				const filtered = rows.filter(row => Number(row.day_of_week) === idx);
				return {
					x: filtered.map(row => row.aest_time),
					y: filtered.map(row => row.delay_seconds),
					mode: 'lines+markers',
					type: 'scatter',
					name: day
				};
			});

			const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bus Delay Over Time by Day</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <style>
    table { border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #ccc; padding: 0.3em 0.7em; text-align: right; }
    th { background: #eee; }
    td:first-child, th:first-child { text-align: left; }
  </style>
</head>
<body>
  <h2>Bus Delay Over Time by Day of Week</h2>
  <div id="plot" style="width:95vw; height:75vh;"></div>
  <h3>Average and Median Delay by Day and 3-Hour Period (AEST)</h3>
  <table>
    <tr>
      <th>Day & 3-Hour Period</th>
      <th>Avg Delay (s)</th>
      <th>Median Delay (s)</th>
      <th>Samples</th>
    </tr>
    ${statsTableRows}
  </table>
  <script>
    const data = ${JSON.stringify(traces)};
    const layout = {
      xaxis: { title: 'Timestamp' },
      yaxis: { title: 'Delay (seconds)' },
      title: 'Bus Delay Over Time by Day of Week'
    };
    Plotly.newPlot('plot', data, layout);
  </script>
</body>
</html>
`;
			callback(null, html);
			db.close();
		}
	);
}

module.exports = { generatePlotHtml };
