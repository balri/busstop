import { getCache, setCache } from "./cache";
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
