import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { DateTime } from "luxon";

import { actorCredits, getRandomActor } from "./actorCredits";
import { getBaconNumber } from "./baconNumber";
import { getDailyActorFromCache } from "./cache";
import { getDailyActorFromSheet, setDailyActorInSheet } from "./googleSheets";
import { movieCredits } from "./movieCredits";

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
		let actor = getDailyActorFromCache(today);
		if (actor) {
			console.log(`Returning cached daily actor for ${today}`);
			return res.json(actor);
		}

		actor = await getDailyActorFromSheet(today);
		if (actor) {
			return res.json(actor);
		}

		return res.status(404).json({
			error: "No actor found for today's date.",
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

// Choose a daily actor for tomorrow and calculate their Bacon number
router.get(
	"/api/prime-daily-actor",
	asyncHandler(async (_req: Request, res: Response) => {
		const tomorrow = DateTime.now()
			.setZone("Australia/Brisbane")
			.plus({ days: 1 })
			.toISODate();

		let actor = getDailyActorFromCache(tomorrow);
		if (actor) {
			return res
				.status(200)
				.json({ message: "Daily actor for tomorrow is already set." });
		}

		actor = await getDailyActorFromSheet(tomorrow);
		if (actor) {
			return res
				.status(200)
				.json({ message: "Daily actor for tomorrow is already set." });
		}

		const MAX_RETRIES = 10;
		let retries = 0;
		while (retries < MAX_RETRIES) {
			actor = await getRandomActor();
			if (!actor) {
				return res
					.status(500)
					.json({ error: "Failed to fetch a random actor." });
			}

			const baconNumberResult = await getBaconNumber(
				Number(actor.id),
				6,
				0,
			);

			if (baconNumberResult) {
				await setDailyActorInSheet(tomorrow, actor, baconNumberResult);
				return res.status(200).json({
					message: "Daily actor for tomorrow has been set.",
				});
			}

			retries++;
		}

		return res.status(404).json({
			message:
				"Failed to set daily actor for tomorrow after multiple attempts.",
		});
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
