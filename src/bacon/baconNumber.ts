import { actorCredits } from "./actorCredits";
import { movieCredits } from "./movieCredits";

const KEVIN_BACON_ID = 4724;

type BaconNumberPathStep = {
	actorId: number;
	actorName: string;
	movieId?: number;
	movieTitle?: string;
};

export type BaconNumberResult = {
	path: BaconNumberPathStep[];
	depth: number;
};

export async function getBaconNumber(
	startActorId: number,
	maxDepth = 6,
	timeoutMs = 30000,
): Promise<BaconNumberResult | null> {
	if (startActorId === KEVIN_BACON_ID) {
		return {
			path: [{ actorId: startActorId, actorName: "Kevin Bacon" }],
			depth: 0,
		};
	}
	const visited = new Set<number>();
	let queue: {
		actorId: number;
		depth: number;
		path: BaconNumberPathStep[];
	}[] = [{ actorId: startActorId, depth: 0, path: [] }];
	const startTime = Date.now();

	while (queue.length > 0) {
		if (timeoutMs > 0 && Date.now() - startTime > timeoutMs) {
			return null;
		}

		const { actorId, depth, path } = queue.shift()!;
		if (depth > maxDepth) continue;
		visited.add(actorId);

		const movies = await movieCredits(actorId);

		for (const movie of movies) {
			const cast = await actorCredits(movie.id);
			for (const actor of cast) {
				if (actor.id === KEVIN_BACON_ID) {
					const baconStep = {
						actorId: actor.id,
						actorName: actor.name,
						movieId: movie.id,
						movieTitle: movie.title,
					};
					return { path: [...path, baconStep], depth: depth + 1 };
				}
				if (!visited.has(actor.id)) {
					const nextStep = {
						actorId: actor.id,
						actorName: actor.name,
						movieId: movie.id,
						movieTitle: movie.title,
					};
					queue.push({
						actorId: actor.id,
						depth: depth + 1,
						path: [...path, nextStep],
					});
					visited.add(actor.id);
				}
			}
		}
	}
	return null;
}
