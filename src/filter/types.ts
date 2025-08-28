export interface DbTable {
	name: string;
	file: string;
	columns: string[];
}

export type CsvRow = Record<string, string>;

export interface Trip {
	route_id: string;
	trip_id: string;
}

export type Trips = Trip[];

export interface StopTime {
	trip_id: string;
	arrival_time: string;
	departure_time: string;
	stop_id: string;
	stop_sequence: string;
}

export type StopTimes = Array<StopTime>;

export type CsvHeader = string[];

export type CsvRows = CsvRow[];
