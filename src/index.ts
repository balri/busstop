import express from 'express';
import path from 'path';
import fs from 'fs';
import { generateToken } from './tokens';
import statusRouter from './routes/status';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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

// Status endpoint
app.use('/', statusRouter);

app.listen(PORT, '0.0.0.0', () => {
	console.log(`Backend listening on port ${PORT}`);
});
