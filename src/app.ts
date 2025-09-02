import express from "express";
import path from "path";

import statusRouter from "./routes/status";

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (_req, res) => res.status(200).send("OK"));
app.use("/", statusRouter);

export default app;
