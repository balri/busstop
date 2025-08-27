import express from 'express';
import path from 'path';
import fs from 'fs';
import { generateToken } from './tokens';
import statusRouter from './routes/status';

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    const token = generateToken();
    fs.readFile(path.join(__dirname, '../public/index.template.html'), 'utf8', (err, html) => {
        if (err) return res.status(500).send('Error loading page');
        const htmlWithToken = html.replace('</head>', `<script>window.BUS_TOKEN="${token}"</script></head>`);
        res.send(htmlWithToken);
    });
});

app.get('/health', (req, res) => res.status(200).send('OK'));
app.use('/', statusRouter);

export default app;