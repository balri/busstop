export interface NearestStop {
	stopId: string;
	stopName: string;
	stopLat: number;
	stopLon: number;
	distance: number;
	routeId: string;
}

export interface NextBus {
	tripId?: string | undefined;
	startDate?: string | undefined;
	arrivalTime: number;
	delay: number | null;
}

interface Stop {
	stop_id: string;
	stop_name: string;
	stop_lat: string;
	stop_lon: string;
	direction_id: number;
	route_id: string;
}

export type Stops = Stop[];

export interface StatusResponse {
	status: string;
	scheduledTime: number | null;
	estimatedTime: number;
	delay: number | null;
	keyword?: string | null;
	nearest: NearestStop | null;
}
