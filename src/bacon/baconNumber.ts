import { actorCredits } from "./actorCredits";
import { movieCredits } from "./movieCredits";

const KEVIN_BACON_ID = 4724;

export async function getBaconNumber(
	startActorId: number,
	maxDepth = 6,
	timeoutMs = 30000,
): Promise<number> {
	if (startActorId === KEVIN_BACON_ID) return 0;
	const visited = new Set<number>();
	let queue: { actorId: number; depth: number }[] = [
		{ actorId: startActorId, depth: 0 },
	];
	const startTime = Date.now();

	while (queue.length > 0) {
		if (Date.now() - startTime > timeoutMs) {
			return 0; // Timed out
		}

		const { actorId, depth } = queue.shift()!;
		if (depth > maxDepth) continue;
		visited.add(actorId);

		const movies = await movieCredits(actorId);

		for (const movie of movies) {
			const cast = await actorCredits(movie.id);
			for (const actor of cast) {
				if (actor.id === KEVIN_BACON_ID) {
					return depth + 1;
				}
				if (!visited.has(actor.id)) {
					queue.push({ actorId: actor.id, depth: depth + 1 });
					visited.add(actor.id);
				}
			}
		}
	}
	return 0; // Not found within maxDepth or timed out
}
