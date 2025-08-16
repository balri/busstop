const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateToken } = require('./tokens');
const statusRouter = require('./routes/status');
const { generatePlotHtml } = require('./plot_delays');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html with a token
app.get('/', (req, res) => {
	const token = generateToken();
	fs.readFile(path.join(__dirname, '../public/index.template.html'), 'utf8', (err, html) => {
		if (err) return res.status(500).send('Error loading page');
		const htmlWithToken = html.replace('</head>', `<script>window.BUS_TOKEN="${token}"</script></head>`);
		res.send(htmlWithToken);
	});
});

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Plot endpoint
app.get('/plot', (req, res) => {
	generatePlotHtml((err, html) => {
		if (err) res.status(500).send('Error generating plot');
		else {
			res.set('Content-Type', 'text/html');
			res.send(html);
		}
	});
});

// Status endpoint
app.use('/', statusRouter);

app.listen(PORT, () => {
	console.log(`Backend listening on port ${PORT}`);
});
