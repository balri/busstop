import path from "path";

export interface DbTable {
	name: string;
	file: string;
	columns: string[];
}

export type CsvRow = Record<string, string>;

export type CsvHeader = string[];

export type CsvRows = CsvRow[];

export interface Route {
	routeId: string;
	routeShortName: string;
	routeLongName: string;
	routeUrl: string;
	routeColor: string;
	routeTextColor: string;
}

export type Routes = Route[];

export interface Trip {
	routeId: string;
	serviceId: string;
	tripId: string;
}

export type Trips = Trip[];

export interface StopTime {
	tripId: string;
	arrivalTime: string;
	stopId: string;
}

export type StopTimes = Array<StopTime>;

export interface Stop {
	stopId: string;
	stopName: string;
	stopLat: string;
	stopLon: string;
}

export type Stops = Stop[];

export interface Calendar {
	serviceId: string;
	monday: boolean;
	tuesday: boolean;
	wednesday: boolean;
	thursday: boolean;
	friday: boolean;
	saturday: boolean;
	sunday: boolean;
}

export type Calendars = Calendar[];

export interface CalendarDate {
	serviceId: string;
	date: string;
	exceptionType: string;
}

export type CalendarDates = CalendarDate[];

export type FeedData =
	| Routes
	| Trips
	| StopTimes
	| Stops
	| Calendars
	| CalendarDates;

export const GTFS_DIR = path.resolve(process.cwd(), "feeds");

export const ROUTES_INPUT_FILE = path.join(GTFS_DIR, "routes.txt");
export const ROUTES_OUTPUT_FILE = path.join(GTFS_DIR, "routes.json");

export const TRIPS_INPUT_FILE = path.join(GTFS_DIR, "trips.txt");
export const TRIPS_OUTPUT_FILE = path.join(GTFS_DIR, "trips.json");

export const STOP_TIMES_INPUT_FILE = path.join(GTFS_DIR, "stop_times.txt");
export const STOP_TIMES_OUTPUT_FILE = path.join(GTFS_DIR, "stop_times.json");

export const STOPS_INPUT_FILE = path.join(GTFS_DIR, "stops.txt");
export const STOPS_OUTPUT_FILE = path.join(GTFS_DIR, "stops.json");

export const CALENDARS_INPUT_FILE = path.join(GTFS_DIR, "calendar.txt");
export const CALENDARS_OUTPUT_FILE = path.join(GTFS_DIR, "calendars.json");

export const CALENDAR_DATES_INPUT_FILE = path.join(
	GTFS_DIR,
	"calendar_dates.txt",
);
export const CALENDAR_DATES_OUTPUT_FILE = path.join(
	GTFS_DIR,
	"calendar_dates.json",
);
