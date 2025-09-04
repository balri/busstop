const busIcon = document.getElementById("bus-icon");
const busStop = document.getElementById("bus-stop");
const busStopDistance = document.getElementById("bus-stop-distance");
const busStopName = document.getElementById("bus-stop-name");
const moon = document.querySelector("#moon-stars .moon");
const moonStars = document.getElementById("moon-stars");
const road = document.querySelector(".road");
const sky = document.getElementById("sky");
const starCanvas = document.getElementById("star-canvas");
const statusText = document.getElementById("status-text");
const sun = document.getElementById("sun");
const timesText = document.getElementById("times-text");

let currentStatus = null;
let pollTimer = null;

let roadBgPos = 0;
let roadMoving = true;
let roadAnimId = null;
const roadSpeed = 1.2; // Adjust for desired speed

const maxDistance = 100; // meters to show keyword and stop the bus

let stars = [];
let twinkleAnimId = null;

let countdownInterval = null;

let lat = -27.491992; // Default latitude
let lon = 153.040728; // Default longitude

let isNight = null; // null = unknown, true = night, false = day

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
				data.nearest.stopName || "Bus Status",
				currentStatus,
				"The bus has arrived!<br>Your keyword is: " + data.keyword,
				data.nearest,
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
	setBusHeadlights(false);
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

function updateMessages(busStop, status, message, nearest = null) {
	busStopName.textContent = busStop;
	statusText.textContent = status.toUpperCase();
	timesText.innerHTML = message;
	if (busStopDistance && nearest !== null) {
		const { distance, stopLat, stopLon } = nearest;
		let distanceText = `Distance: <b>${displayDistance(distance)}</b>`;
		if (distance && distance > maxDistance) {
			distanceText += `<br>
			<a href="https://www.google.com/maps/search/?api=1&query=${stopLat},${stopLon}" target="_blank">
				View in Google Maps
			</a>`;
		}
		busStopDistance.innerHTML = distanceText;
	}
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
				}),
			})
				.then((res) => {
					if (res.status === 404) {
						res.json().then(() => {
							updateMessages(
								"No Nearby Bus Stop",
								"NO BUS STOP",
								"Please go to a bus stop and try again.",
							);
							stopEverything();
						});
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
							"Bus Status",
							"NO SERVICE",
							`
								The service is not currently running.<br>
								<a href="https://jp.translink.com.au/plan-your-journey/timetables/bus/t/61" target="_blank">
									View timetables on TransLink
								</a>
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
				.catch(() => {
					updateMessages(
						"Bus Status",
						"ERROR",
						`
						Error loading status<br>
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
			delayMsg = `${delayMins} min ${currentStatus}`;
		} else if (data.status == "early") {
			delayMsg = `${Math.abs(delayMins)} min ${currentStatus}`;
		} else {
			delayMsg = currentStatus;
		}

		updateMessages(
			data.nearest.stopName || "Bus Status",
			currentStatus,
			`
				The bus scheduled to arrive at<br>
				<b>${scheduled}</b><br>
				is ${delayMsg} and will arrive in:<br>
				<b>${mins}m ${secs.toString().padStart(2, "0")}s</b>
			`,
			data.nearest,
		);

		if (diff === 0) {
			clearInterval(countdownInterval);

			if (data.keyword) {
				showBusStopAndStopRoad(data);
			} else if (
				data.nearest.distance !== null &&
				data.nearest.distance <= maxDistance
			) {
				window.location.reload();
			} else {
				updateMessages(
					data.nearest.stopName || "Bus Status",
					"NOT CLOSE ENOUGH",
					`
                        The bus has arrived!<br>
                        You need to get closer to the bus stop.
                    `,
					data.nearest,
				);
				showBusStopAndStopRoad(data);
				stopPolling();
			}
		}
	}

	updateCountdown();
	countdownInterval = setInterval(updateCountdown, 1000);
}

function updateSkyBySunTimes(lat, lon) {
	const now = new Date();
	const times = SunCalc.getTimes(now, lat, lon);

	let bg;
	const nightNow = !(now >= times.dawn && now < times.dusk);

	if (nightNow !== isNight) {
		isNight = nightNow;
		if (isNight) {
			// Night: show and animate stars
			if (starCanvas) {
				starCanvas.style.display = "";
				startStarAnimation();
			}
		} else {
			// Day: hide and stop stars
			if (starCanvas) starCanvas.style.display = "none";
			cancelStarAnimation();
		}
	}

	if (isNight) {
		// Night or twilight
		setBusHeadlights(true);

		if (sun) sun.style.display = "none";
		if (moonStars) moonStars.style.display = "";
		if (
			(now >= times.dusk && now < times.night) ||
			(now >= times.nightEnd && now < times.dawn)
		) {
			// Twilight
			bg = "linear-gradient(to bottom, #415a77 0%, #778da9 100%)";
			if (timesText) timesText.style.color = "#cfe2ff";
			if (busStopDistance) busStopDistance.style.color = "#cfe2ff";
		} else {
			// Night
			bg = "linear-gradient(to bottom, #232526 0%, #414345 100%)";
			if (timesText) timesText.style.color = "#fffbe6";
			if (busStopDistance) busStopDistance.style.color = "#fffbe6";
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
	} else {
		// Day
		setBusHeadlights(false);

		bg = "linear-gradient(to bottom, #87ceeb 0%, #f0f8ff 100%)";
		if (sun) sun.style.display = "";
		if (moonStars) moonStars.style.display = "none";
		if (timesText) timesText.style.color = "#444";
		if (busStopDistance) busStopDistance.style.color = "#444";

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

function setBusHeadlights(on) {
	document.getElementById("headlight-beam").style.display = on
		? "block"
		: "none";
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

function createStars() {
	const canvas = document.getElementById("star-canvas");
	if (!canvas) return;
	const dpr = window.devicePixelRatio || 1;
	const width = window.innerWidth;
	const height = parseFloat(getComputedStyle(canvas).height);

	const starDensity = 0.6; // stars per px
	const starCount = Math.round(width * starDensity);

	stars = [];
	for (let i = 0; i < starCount; i++) {
		stars.push({
			x: Math.random() * width * dpr,
			y: Math.random() * height * dpr,
			r: (Math.random() * 0.7 + 0.3) * dpr,
			baseAlpha: Math.random() * 0.5 + 0.5,
			twinkleSpeed: Math.random() * 1.5 + 0.5, // radians/sec
			twinklePhase: Math.random() * Math.PI * 2,
		});
	}
}

function animateStars() {
	const canvas = document.getElementById("star-canvas");
	if (!canvas) return;
	const dpr = window.devicePixelRatio || 1;
	const width = window.innerWidth;
	const height = parseFloat(getComputedStyle(canvas).height);

	canvas.width = width * dpr;
	canvas.height = height * dpr;
	canvas.style.width = width + "px";
	canvas.style.height = height + "px";

	const ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const now = performance.now() / 1000; // seconds

	for (const star of stars) {
		const twinkle =
			0.4 * Math.sin(now * star.twinkleSpeed + star.twinklePhase);
		const alpha = Math.max(0, Math.min(1, star.baseAlpha + twinkle));
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.arc(star.x, star.y, star.r, 0, 2 * Math.PI);
		ctx.fillStyle = "#fffbe6";
		ctx.shadowColor = "#fffbe6";
		ctx.shadowBlur = 4 * dpr;
		ctx.fill();
	}
	ctx.globalAlpha = 1;

	twinkleAnimId = requestAnimationFrame(animateStars);
}

function startStarAnimation() {
	cancelStarAnimation();
	createStars();
	animateStars();
}

function cancelStarAnimation() {
	if (twinkleAnimId) {
		cancelAnimationFrame(twinkleAnimId);
		twinkleAnimId = null;
	}
}

// Redraw stars on resize
window.addEventListener("resize", startStarAnimation);
