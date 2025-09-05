import path from "path";

export interface DbTable {
	name: string;
	columns: string[];
}

export type CsvRow = Record<string, string>;

export type CsvRows = CsvRow[];

interface Trip {
	route_id: string;
	service_id: string;
	trip_id: string;
	direction_id: number;
}

export type Trips = Trip[];

interface StopTime {
	trip_id: string;
	arrival_time: string;
	stop_id: string;
}

export type StopTimes = StopTime[];

export const GTFS_DIR = path.resolve(process.cwd(), "feeds");
export const GTFS_URL = "https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip";

export const ROUTES_INPUT_FILE = path.join(GTFS_DIR, "routes.txt");
export const TRIPS_INPUT_FILE = path.join(GTFS_DIR, "trips.txt");
export const STOP_TIMES_INPUT_FILE = path.join(GTFS_DIR, "stop_times.txt");
export const STOPS_INPUT_FILE = path.join(GTFS_DIR, "stops.txt");
export const STOPS_OUTPUT_FILE = path.join(process.cwd(), "stops.json");
export const CALENDARS_INPUT_FILE = path.join(GTFS_DIR, "calendar.txt");
export const CALENDAR_DATES_INPUT_FILE = path.join(
	GTFS_DIR,
	"calendar_dates.txt",
);

export const DB_FILE = path.join(path.resolve(process.cwd()), "gtfs.db");

export const ROUTES_TABLE: DbTable = {
	name: "routes",
	columns: [
		"route_id TEXT",
		"route_short_name TEXT",
		"route_long_name TEXT",
		"route_url TEXT",
		"route_color TEXT",
		"route_text_color TEXT",
	],
};

export const TRIPS_TABLE: DbTable = {
	name: "trips",
	columns: [
		"route_id TEXT",
		"service_id TEXT",
		"trip_id TEXT",
		"direction_id INTEGER",
	],
};

export const STOP_DIRECTIONS_TABLE: DbTable = {
	name: "stop_directions",
	columns: ["stop_id TEXT", "direction_id INTEGER"],
};

export const STOP_TIMES_TABLE: DbTable = {
	name: "stop_times",
	columns: [
		"trip_id TEXT",
		"arrival_time TEXT",
		"departure_time TEXT",
		"stop_id TEXT",
	],
};

export const STOP_TABLE: DbTable = {
	name: "stops",
	columns: [
		"stop_id TEXT",
		"stop_code TEXT",
		"stop_name TEXT",
		"stop_desc TEXT",
		"stop_lat REAL",
		"stop_lon REAL",
	],
};

export const SERVICES_TABLE: DbTable = {
	name: "services",
	columns: [
		"service_id TEXT",
		"monday INTEGER",
		"tuesday INTEGER",
		"wednesday INTEGER",
		"thursday INTEGER",
		"friday INTEGER",
		"saturday INTEGER",
		"sunday INTEGER",
		"start_date TEXT",
		"end_date TEXT",
	],
};

export const SERVICE_DATES_TABLE: DbTable = {
	name: "service_dates",
	columns: ["service_id TEXT", "date TEXT", "exception_type INTEGER"],
};
