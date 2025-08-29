const statusText = document.getElementById("statusText");
const busIcon = document.getElementById("busIcon");
const road = document.querySelector(".road");
const busStop = document.getElementById("bus-stop");
const timesText = document.getElementById("timesText");
const busStopName = document.getElementById("busStopName");

let currentStatus = null;
let pollTimer = null;

let roadBgPos = 0;
let roadMoving = true;
let roadAnimId = null;
const roadSpeed = 1.2; // Adjust for desired speed

let countdownInterval = null;

let lat = -27.491992; // Default latitude
let lon = 153.040728; // Default longitude

function startPolling() {
	if (pollTimer) return; // Prevent multiple intervals
	pollTimer = setInterval(fetchStatus, 30000);
}

function stopPolling() {
	if (pollTimer) {
		clearTimeout(pollTimer);
		pollTimer = null;
	}
}

// Listen for tab visibility changes
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		stopPolling();
	} else {
		startPolling();
	}
});

function secondsToHHMMSS(seconds) {
	const date = new Date(seconds * 1000);
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

function animateRoad() {
	if (!roadMoving) return;
	roadBgPos -= roadSpeed;
	road.style.setProperty("--road-bg-x", `${roadBgPos}px`);
	roadAnimId = requestAnimationFrame(animateRoad);
}

function showBusStopAndStopRoad(data) {
	setBusStopTransition(roadSpeed);
	busStop.classList.remove("visible");
	busStop.classList.remove("hidden");
	setTimeout(() => {
		busStop.classList.add("visible");
	}, 20);
	busStop.addEventListener(
		"transitionend",
		() => {
			stopRoad(data);
		},
		{ once: true },
	);
}

function stopRoad(data) {
	roadMoving = false;
	if (roadAnimId) {
		cancelAnimationFrame(roadAnimId);
		if (data?.keyword) {
			updateMessages(
				data.stopName || "Bus Status",
				currentStatus,
				"The bus has arrived!<br>Your keyword is: " + data.keyword,
			);
		}
		roadAnimId = null;
	}
}

function stopEverything() {
	stopPolling();
	stopRoad();
	if (countdownInterval) {
		clearInterval(countdownInterval);
		countdownInterval = null;
	}
	busIcon.classList.add("hidden");
	busStop.classList.add("hidden");
}

function xorEncrypt(text, key) {
	let result = "";
	for (let i = 0; i < text.length; i++) {
		result += String.fromCharCode(
			text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
		);
	}
	return btoa(result); // base64 encode for safe transport
}

function updateMessages(busStop, status, message) {
	busStopName.textContent = busStop;
	statusText.textContent = status.toUpperCase();
	timesText.innerHTML = message;
}

function displayDistance(distance) {
	if (distance >= 1000) {
		return (distance / 1000).toFixed(2) + "km";
	} else {
		return distance + "m";
	}
}

async function fetchStatus() {
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			const { latitude, longitude } = pos.coords;
			lat = latitude;
			lon = longitude;
			const loc = JSON.stringify({ lat, lon });
			const encryptedLoc = xorEncrypt(loc, window.BUS_TOKEN);
			updateSkyBySunTimes(latitude, longitude);

			fetch("/status", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					loc: encryptedLoc,
					token: window.BUS_TOKEN,
				}),
			})
				.then((res) => {
					if (res.status === 404) {
						res.json().then((data) => {
							if (data.nearest) {
								const { stopName, stopLat, stopLon, distance } =
									data.nearest;
								updateMessages(
									"No Nearby Bus Stop",
									"NO BUS STOP",
									`
										Closest stop: <b>${stopName}</b><br>
										Distance: <b>${displayDistance(distance)}</b><br>
										<a href="https://www.google.com/maps/search/?api=1&query=${stopLat},${stopLon}" target="_blank">
											View in Google Maps
										</a>
									`,
								);
							} else {
								updateMessages(
									"No Nearby Bus Stop",
									"NO BUS STOP",
									"Please go to a bus stop and try again.",
								);
							}
							stopEverything();
						});
						return null;
					}
					if (res.status === 403) {
						updateMessages(
							"Session Expired",
							"SESSION EXPIRED",
							"Please refresh the page to continue.",
						);
						stopEverything();
						return null;
					}
					return res.json();
				})
				.then((data) => {
					if (!data) return;

					if (
						!data.estimatedTime ||
						!data.scheduledTime ||
						data.status === "no_service"
					) {
						updateMessages(
							data.stopName || "Bus Status",
							"NO SERVICE",
							`
							The service is not currently running.<br>
							Please check back later.
						`,
						);

						stopEverything();
						return;
					}

					busIcon.classList.remove("hidden");
					if (data.keyword) {
						stopPolling();
					}
					startCountdown(data);
				})
				.catch((e) => {
					console.error(e);
					updateMessages(
						"Bus Status",
						"ERROR",
						`
						Error loading status.<br>
						Please try again later.
						`,
					);
					stopEverything();
				});
		},
		() => {
			updateMessages(
				"Could not get your location",
				"NO LOCATION",
				"Location access is required to find nearby bus stops.",
			);
			stopEverything();
		},
	);
}

function setBusStopTransition(roadSpeed) {
	const vw = window.innerWidth;
	// Get the offset in px (2rem or 1.2rem depending on screen size)
	const style = getComputedStyle(document.documentElement);
	const rem = parseFloat(style.fontSize);
	const offsetPx = window.matchMedia("(max-width: 600px)").matches
		? 1.2 * rem
		: 2 * rem;

	const stopFinal = vw / 2 + offsetPx;
	const distance = vw - stopFinal;
	const frames = distance / roadSpeed;
	let duration = frames / 60; // 60fps

	duration *= 0.5; // Slow down a bit for smoother transition

	busStop.style.transition = `left ${duration}s linear`;
}

function startCountdown(data) {
	if (countdownInterval) clearInterval(countdownInterval);

	function updateCountdown() {
		const scheduled = secondsToHHMMSS(data.scheduledTime);
		currentStatus = data.status.replace("_", " ");
		const now = Math.floor(Date.now() / 1000);
		let diff = data.estimatedTime - now;
		if (diff < 0) diff = 0;
		const mins = Math.floor(diff / 60);
		const secs = diff % 60;

		let delayMsg = "";
		const delayMins = Math.round(data.delay / 60);
		if (data.status == "late") {
			delayMsg = `${delayMins} min `;
		} else if (data.status == "early") {
			delayMsg = `${Math.abs(delayMins)} min `;
		}
		updateMessages(
			data.stopName || "Bus Status",
			currentStatus,
			`
				The bus scheduled to arrive at<br>
				<b>${scheduled}</b><br>
				is ${delayMsg}${currentStatus} and will arrive in:<br>
				<b>${mins}m ${secs.toString().padStart(2, "0")}s</b>
			`,
		);
		if (diff === 0) {
			clearInterval(countdownInterval);

			if (data.keyword) {
				showBusStopAndStopRoad(data);
			} else {
				// No keyword, likely due to polling being paused
				updateMessages(
					data.stopName || "Bus Status",
					"REFRESH REQUIRED",
					`
                        The countdown has finished, but the page was inactive.<br>
                        Please refresh the page to continue.
                    `
				);
			}
		}
	}

	updateCountdown();
	countdownInterval = setInterval(updateCountdown, 1000);
}

function getMockTime() {
	const url = new URL(window.location.href);
	const mock = url.searchParams.get("mockTime");
	return mock ? new Date(mock) : new Date();
}

// Replace all `new Date()` with `getMockTime()` in updateSkyBySunTimes
function updateSkyBySunTimes(lat, lon) {
	const now = getMockTime();
	const times = SunCalc.getTimes(now, lat, lon);

	const sun = document.getElementById("sun");
	const moonStars = document.getElementById("moon-stars");
	const moon = document.querySelector("#moon-stars .moon");
	const sky = document.getElementById("sky");
	const timesText = document.getElementById("timesText");

	let bg;
	if (now >= times.dawn && now < times.dusk) {
		// Day
		bg = "linear-gradient(to bottom, #87ceeb 0%, #f0f8ff 100%)";
		if (sun) sun.style.display = "";
		if (moonStars) moonStars.style.display = "none";
		if (timesText) timesText.style.color = "#444";

		// --- Sun position ---
		if (sun && sky) {
			const sunPos = SunCalc.getPosition(now, lat, lon);
			// Map azimuth (0 to 2PI) to left (0% to 100%)
			const left = 50 + 40 * Math.sin(sunPos.azimuth); // -40% to +40% from center
			// Map altitude (-PI/2 to PI/2) to top (100% to 0%)
			const top = 90 - 140 * (sunPos.altitude / (Math.PI / 2)); // exaggerate vertical movement
			sun.style.left = `${left}%`;
			sun.style.top = `${top}%`;
		}
	} else {
		if (sun) sun.style.display = "none";
		if (moonStars) moonStars.style.display = "";
		if (
			(now >= times.dusk && now < times.night) ||
			(now >= times.nightEnd && now < times.dawn)
		) {
			// Twilight
			bg = "linear-gradient(to bottom, #415a77 0%, #778da9 100%)";
			if (timesText) timesText.style.color = "#cfe2ff";
		} else {
			// Night
			bg = "linear-gradient(to bottom, #232526 0%, #414345 100%)";
			if (timesText) timesText.style.color = "#fffbe6";
		}

		// --- Moon position ---
		if (moon && sky) {
			const moonPos = SunCalc.getMoonPosition(now, lat, lon);
			const left = 50 + 40 * Math.sin(moonPos.azimuth);
			const top = 90 - 140 * (moonPos.altitude / (Math.PI / 2)); // exaggerate vertical movement
			moon.style.left = `${left}%`;
			moon.style.top = `${top}%`;
		}

		if (moon) {
			const moonIllum = SunCalc.getMoonIllumination(now);
			moon.textContent = getMoonPhaseEmoji(moonIllum.phase);
		}
	}
	document.body.style.background = bg;
}

function getMoonPhaseEmoji(phase) {
	if (phase < 0.03 || phase > 0.97) return "🌑"; // New moon
	if (phase < 0.22) return "🌒"; // Waxing crescent
	if (phase < 0.28) return "🌓"; // First quarter
	if (phase < 0.47) return "🌔"; // Waxing gibbous
	if (phase < 0.53) return "🌕"; // Full moon
	if (phase < 0.72) return "🌖"; // Waning gibbous
	if (phase < 0.78) return "🌗"; // Last quarter
	return "🌘"; // Waning crescent
}

updateSkyBySunTimes(lat, lon);
setInterval(() => {
	updateSkyBySunTimes(lat, lon);
}, 60 * 1000);

// Start the road animation when the page loads
roadMoving = true;
animateRoad();

startPolling();
fetchStatus();

// On initial render:
busStop.classList.add("no-transition");
setTimeout(() => {
	busStop.classList.remove("no-transition");
}, 100);
