import express from "express";
import fs from "fs";
import path from "path";

import statusRouter, { BUS_TOKEN } from "./routes/status";

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (_req, res) => {
	const token = BUS_TOKEN;
	fs.readFile(
		path.join(__dirname, "../public/index.template.html"),
		"utf8",
		(err, html) => {
			if (err) return res.status(500).send("Error loading page");
			const htmlWithToken = html.replace(
				"</head>",
				`<script>window.BUS_TOKEN="${token}"</script></head>`,
			);
			return res.send(htmlWithToken);
		},
	);
});

app.get("/health", (_req, res) => res.status(200).send("OK"));
app.use("/", statusRouter);

export default app;
