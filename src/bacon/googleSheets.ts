import { JWT } from "google-auth-library";
import { google } from "googleapis";

import { BaconNumberResult } from "./baconNumber";
import { setCache } from "./cache";
import { Actor, TMDB_BASE_URL, TMDB_KEY } from "./types";

const SHEET_ID = process.env["BACON_SHEET_ID"] || "";
const SHEET_RANGE = "DailyActor!A:D";

export const COLUMN_INDEX = 0;
export const COLUMN_DATE = 1;
export const COLUMN_ACTOR_ID = 2;
export const COLUMN_BACON_NUMBER = 3;
export const COLUMN_ACTOR_NAME = 4;
export const COLUMN_DATE_MODIFIED = 5;
export const COLUMN_JSON = 6;

const auth = new JWT({
	email: process.env["BACON_SERVICE_ACCOUNT_EMAIL"] || "",
	key: process.env["BACON_PRIVATE_KEY"]?.replace(/\\n/g, "\n") || "",
	scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export async function getDailyActorFromSheet(
	date: string | null,
): Promise<Actor | null> {
	const res = await sheets.spreadsheets.values.get({
		spreadsheetId: SHEET_ID,
		range: SHEET_RANGE,
	});
	const rows = res.data.values || [];
	let dailyActor: string[] | null = null;
	for (const row of rows) {
		if (row[COLUMN_DATE] === date) {
			dailyActor = row;
			break;
		}
	}

	if (dailyActor) {
		let resp;
		try {
			resp = await fetch(
				`${TMDB_BASE_URL}/person/${dailyActor[COLUMN_ACTOR_ID]}?api_key=${TMDB_KEY}`,
			);
		} catch (err) {
			console.error("Network error fetching TMDB:", err);
			return null;
		}
		if (!resp.ok) {
			const errorText = await resp.text();
			console.error("TMDB error:", resp.status, errorText);
			return null;
		}
		let actor;
		try {
			actor = await resp.json();
		} catch (err) {
			console.error("Invalid JSON from TMDB:", err);
			return null;
		}
		actor.bacon_number = Number(dailyActor[COLUMN_BACON_NUMBER] || 0);
		const cacheKey = `daily-actor-${date}`;
		setCache(cacheKey, actor, 86400); // Cache for 24 hours
		return actor;
	}

	return null;
}

export async function setDailyActorInSheet(
	date: string | null,
	actor: Actor,
	baconNumberResult: BaconNumberResult | null,
): Promise<void> {
	const res = await sheets.spreadsheets.values.get({
		spreadsheetId: SHEET_ID,
		range: SHEET_RANGE,
	});
	const rows: (string[] | undefined)[] = res.data.values || [];
	let found = false;
	let maxIndex = 0;
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const idx = parseInt(row?.[COLUMN_INDEX] || "0", 10);
		if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
		if (Array.isArray(row) && row[COLUMN_DATE] === date) {
			await sheets.spreadsheets.values.update({
				spreadsheetId: SHEET_ID,
				range: `DailyActor!A${i + 1}:D${i + 1}`,
				valueInputOption: "RAW",
				requestBody: {
					values: [
						[
							row[COLUMN_INDEX],
							date,
							actor.id,
							baconNumberResult ? baconNumberResult.depth : 0,
							actor.name,
							new Date().toISOString(),
							JSON.stringify(baconNumberResult),
						],
					],
				},
			});
			found = true;
			break;
		}
	}

	if (!found) {
		const nextIndex = maxIndex + 1;
		const dateAdded = new Date().toISOString();
		await sheets.spreadsheets.values.append({
			spreadsheetId: SHEET_ID,
			range: SHEET_RANGE,
			valueInputOption: "RAW",
			requestBody: {
				values: [
					[
						String(nextIndex),
						date,
						actor.id,
						baconNumberResult ? baconNumberResult.depth : 0,
						actor.name,
						dateAdded,
						JSON.stringify(baconNumberResult),
					],
				],
			},
		});
	}
}
