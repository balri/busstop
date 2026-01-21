import { getCache, setCache } from "./cache";
import { movieCredits } from "./movieCredits";
import { Actor, TMDB_BASE_URL, TMDB_KEY } from "./types";

export const actorCredits = async (movieId: number): Promise<Actor[]> => {
	const cacheKey = `actors-${movieId}`;
	const cached = getCache(cacheKey);
	if (cached) {
		console.log(`Cached actors for movie ID: ${movieId}`);
		return cached as Actor[];
	}

	console.log(`Uncached actors for movie ID: ${movieId}`);
	let resp;
	try {
		resp = await fetch(
			`${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_KEY}`,
		);
	} catch (error) {
		console.error("Network error fetching TMDB:", error);
		return [];
	}
	if (!resp.ok) {
		const errorText = await resp.text();
		console.error("TMDB error:", resp.status, errorText);
		return [];
	}

	let data: { cast: Actor[] };
	try {
		data = await resp.json();
	} catch (error) {
		console.error("Invalid JSON from TMDB:", error);
		return [];
	}
	const actors = data.cast.filter(
		(a: Actor) =>
			!a.adult && a.profile_path && a.known_for_department === "Acting",
	);
	setCache(cacheKey, actors, 3600);

	return actors;
};

export const getRandomActor = async (): Promise<Actor | null> => {
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
				return null;
			}
			if (!resp.ok) {
				const errorText = await resp.text();
				console.error("TMDB error:", resp.status, errorText);
				return null;
			}
			try {
				data = (await resp.json()) as { results: Actor[] };
			} catch (err) {
				console.error("Invalid JSON from TMDB:", err);
				return null;
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
				return person;
			}
		}

		retries++;
	}

	return null;
};
