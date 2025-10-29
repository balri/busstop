export const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface Actor {
	id: number;
	name: string;
	profile_path?: string;
	known_for: Movie[];
	known_for_department: string;
}

export interface Movie {
	id: number;
	title: string;
	poster_path?: string;
	vote_average: number;
	vote_count: number;
	media_type?: string;
	original_language: string;
	adult: boolean;
	popularity: number;
	genre_ids: number[];
	release_date?: string;
	overview?: string;
}

const GENRE_DOCUMENTARY = 99;
const GENRE_MUSIC = 10402;
const GENRE_NEWS = 10763;
const GENRE_REALITY = 10764;
const GENRE_TV_MOVIE = 10770;
const GENRE_ACTION = 28;
const GENRE_ADVENTURE = 12;
const GENRE_ANIMATION = 16;
const GENRE_COMEDY = 35;
const GENRE_CRIME = 80;
const GENRE_DRAMA = 18;
const GENRE_FAMILY = 10751;
const GENRE_FANTASY = 14;
const GENRE_HISTORY = 36;
const GENRE_HORROR = 27;
const GENRE_ROMANCE = 10749;
const GENRE_SCI_FI = 878;
const GENRE_THRILLER = 53;
const GENRE_WESTERN = 37;
const GENRE_MYSTERY = 9648;

export const EXCLUDED_GENRES = [
	GENRE_DOCUMENTARY,
	GENRE_MUSIC,
	GENRE_NEWS,
	GENRE_REALITY,
	GENRE_TV_MOVIE,
];
export const MAINSTREAM_GENRES = [
	GENRE_ACTION,
	GENRE_ADVENTURE,
	GENRE_ANIMATION,
	GENRE_COMEDY,
	GENRE_CRIME,
	GENRE_DRAMA,
	GENRE_FAMILY,
	GENRE_FANTASY,
	GENRE_HISTORY,
	GENRE_HORROR,
	GENRE_MYSTERY,
	GENRE_ROMANCE,
	GENRE_SCI_FI,
	GENRE_THRILLER,
	GENRE_WESTERN,
];
