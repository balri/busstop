import { movieCredits } from "./movieCredits";

// Mock dependencies
jest.mock("./cache", () => ({
	getCache: jest.fn(() => undefined),
	setCache: jest.fn(),
}));

global.fetch = jest.fn();

const mockActorId = 123;

describe("movieCredits", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should not return movies with no genre_ids", async () => {
		(fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => ({
				cast: [
					{
						id: 1,
						title: "No Genre Movie",
						genre_ids: [],
						adult: false,
						original_language: "en",
						release_date: "2020-01-01",
						vote_average: 7.5,
						vote_count: 100,
					},
					{
						id: 2,
						title: "Valid Genre Movie",
						genre_ids: [28], // Assume 28 is a mainstream genre
						adult: false,
						original_language: "en",
						release_date: "2020-01-01",
						vote_average: 7.5,
						vote_count: 100,
					},
				],
			}),
		});

		const movies = await movieCredits(mockActorId, true);
		expect(movies).toHaveLength(1);
		expect(movies[0].title).toBe("Valid Genre Movie");
	});

	it("should not return movies with an excluded genre", async () => {
		// Assume 99 is an excluded genre (should match EXCLUDED_GENRES in types.ts)
		(fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => ({
				cast: [
					{
						id: 3,
						title: "Excluded Genre Movie",
						genre_ids: [99],
						adult: false,
						original_language: "en",
						release_date: "2020-01-01",
						vote_average: 7.5,
						vote_count: 100,
					},
					{
						id: 4,
						title: "Valid Genre Movie",
						genre_ids: [28], // Assume 28 is a mainstream genre
						adult: false,
						original_language: "en",
						release_date: "2020-01-01",
						vote_average: 7.5,
						vote_count: 100,
					},
				],
			}),
		});

		const movies = await movieCredits(mockActorId, true);
		expect(movies).toHaveLength(1);
		expect(movies[0].title).toBe("Valid Genre Movie");
	});
});
