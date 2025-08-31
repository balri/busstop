import { DateTime } from "luxon";

export function haversine(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 6371000;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
			Math.cos(toRad(lat2)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export function xorDecrypt(encoded: string, key: string): string {
	const text = Buffer.from(encoded, "base64").toString("binary");
	let result = "";
	for (let i = 0; i < text.length; i++) {
		result += String.fromCharCode(
			text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
		);
	}
	return result;
}

export function scheduledTimeToUnix(
	startDate: string,
	scheduledTime: string,
): number {
	const year = +startDate.substring(0, 4);
	const month = +startDate.substring(4, 6);
	const day = +startDate.substring(6, 8);
	const [hours, minutes, seconds] = scheduledTime.split(":").map(Number);
	const dt = DateTime.fromObject(
		{ year, month, day, hour: hours, minute: minutes, second: seconds },
		{ zone: "Australia/Brisbane" },
	);
	return Math.floor(dt.toSeconds());
}
