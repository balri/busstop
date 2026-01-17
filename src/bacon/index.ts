import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { DateTime } from "luxon";
import fetch from "node-fetch";

import { actorCredits } from "./actorCredits";
import { getBaconNumber } from "./baconNumber";
import { getCache, setCache } from "./cache";
import {
	COLUMN_ACTOR_ID,
	COLUMN_BACON_NUMBER,
	getDailyActorFromSheet,
	setDailyActorInSheet,
} from "./googleSheets";
import { movieCredits } from "./movieCredits";
import { Actor, TMDB_BASE_URL, TMDB_KEY } from "./types";

const router = express.Router();

router.use(
	cors({
		origin: ["https://bacon-topaz.vercel.app", "http://localhost:5173"],
	}),
);

const limiter = rateLimit({
	windowMs: 60 * 1000,
	max: 60,
	message: {
		error: "Too many requests, please try again later.",
	},
});
router.use(limiter);

const asyncHandler =
	(
		fn: (
			req: Request,
			res: Response,
			next: NextFunction,
		) => Promise<unknown>,
	) =>
	(req: Request, res: Response, next: NextFunction) =>
		Promise.resolve(fn(req, res, next)).catch(next);

router.get(
	"/api/daily-actor",
	asyncHandler(async (_req: Request, res: Response) => {
		const today = DateTime.now().setZone("Australia/Brisbane").toISODate();
		const cacheKey = `daily-actor-${today}`;
		let actor = getCache(cacheKey);
		if (actor) {
			console.log(`Returning cached daily actor for ${today}`);
			return res.json(actor);
		}

		const dailyActor = await getDailyActorFromSheet(today);
		if (Array.isArray(dailyActor) && dailyActor.length > 0) {
			let resp;
			try {
				resp = await fetch(
					`${TMDB_BASE_URL}/person/${dailyActor[COLUMN_ACTOR_ID]}?api_key=${TMDB_KEY}`,
				);
			} catch (err) {
				console.error("Network error fetching TMDB:", err);
				return res.status(502).json({ error: "Failed to reach TMDB." });
			}
			if (!resp.ok) {
				const errorText = await resp.text();
				console.error("TMDB error:", resp.status, errorText);
				return res.status(resp.status).json({
					error: `TMDB error: ${resp.status}`,
					message: errorText,
				});
			}
			let actor;
			try {
				actor = await resp.json();
			} catch (err) {
				console.error("Invalid JSON from TMDB:", err);
				return res
					.status(502)
					.json({ error: "Invalid response from TMDB." });
			}
			actor.bacon_number = Number(dailyActor[COLUMN_BACON_NUMBER] || 0);
			setCache(cacheKey, actor, 86400); // Cache for 24 hours
			return res.json(actor);
		}

		const MAX_RETRIES = 10;
		let retries = 0;
		while (retries < MAX_RETRIES) {
			const page = Math.floor(Math.random() * 500);
			const pageCacheKey = "random-actor-page-" + page;
			let data: { results: Actor[] };

			const cached = getCache(pageCacheKey);
			if (cached) {
				console.log(`Cached popular actors for page ${page}`);
				data = { results: cached as Actor[] };
			} else {
				console.log(`Uncached popular actors for page ${page}`);
				let resp;
				try {
					resp = await fetch(
						`${TMDB_BASE_URL}/person/popular?page=${page}&api_key=${TMDB_KEY}`,
					);
				} catch (err) {
					console.error("Network error fetching TMDB:", err);
					return res
						.status(502)
						.json({ error: "Failed to reach TMDB." });
				}
				if (!resp.ok) {
					const errorText = await resp.text();
					console.error("TMDB error:", resp.status, errorText);
					return res.status(resp.status).json({
						error: `TMDB error: ${resp.status}`,
						message: errorText,
					});
				}
				try {
					data = (await resp.json()) as { results: Actor[] };
				} catch (err) {
					console.error("Invalid JSON from TMDB:", err);
					return res
						.status(502)
						.json({ error: "Invalid response from TMDB." });
				}
				setCache(pageCacheKey, data.results, 3600);
			}

			const shuffled = data.results.sort(() => 0.5 - Math.random());

			for (const person of shuffled) {
				if (
					!person.profile_path ||
					person.known_for_department !== "Acting" ||
					person.adult
				) {
					continue;
				}

				const movies = await movieCredits(person.id).then(
					(movies) => movies,
				);
				if (movies.length >= 5) {
					setCache(cacheKey, person, 86400); // Cache for 24 hours

					const baconNumber = await getBaconNumber(person.id);

					await setDailyActorInSheet(
						today,
						String(person.id ?? ""),
						person.name ?? "",
						baconNumber,
					);
					return res.json(person);
				}
			}

			retries++;
		}

		return res.status(404).json({
			error: "No suitable actor found after several attempts.",
		});
	}),
);

router.get(
	"/api/movies/:actorId",
	asyncHandler(async (req: Request, res: Response) => {
		const { actorId } = req.params;
		const movies = await movieCredits(Number(actorId));
		res.json(movies);
	}),
);

router.get(
	"/api/actors/:movieId",
	asyncHandler(async (req: Request, res: Response) => {
		const { movieId } = req.params;
		const actors = await actorCredits(Number(movieId));
		return res.json(actors);
	}),
);

router.get(
	"/api/bacon-number/:actorId",
	asyncHandler(async (req: Request, res: Response) => {
		const { actorId } = req.params;
		const baconNumber = await getBaconNumber(Number(actorId));
		return res.json({ baconNumber });
	}),
);

router.use(
	(err: unknown, _req: Request, res: Response, _next: NextFunction) => {
		const error = err as Error;
		console.error("Error:", error);
		res.status(500).json({
			error: "Internal server error",
			message: error.message || "Something went wrong",
		});
	},
);

export default router;
