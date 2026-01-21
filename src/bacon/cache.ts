import { Actor, Movie } from "./types";

type CacheEntry = {
	data: Actor | Actor[] | Movie[];
	expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export function setCache(
	key: string,
	data: Actor | Actor[] | Movie[],
	ttlSeconds: number = 300,
) {
	const expiresAt = Date.now() + ttlSeconds * 1000;
	cache.set(key, { data, expiresAt });
}

export function getCache(key: string): Actor | Actor[] | Movie[] | null {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}
	return entry.data;
}

export function clearCache() {
	cache.clear();
}

export function getDailyActorFromCache(date: string | null): Actor | null {
	const cacheKey = `daily-actor-${date}`;
	return getCache(cacheKey) as Actor | null;
}
