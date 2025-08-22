const statusText = document.getElementById('statusText');
const busIcon = document.getElementById('busIcon');
const road = document.querySelector('.road');
const busStop = document.getElementById('bus-stop');
const timesText = document.getElementById('timesText');
const busStopName = document.getElementById('busStopName');

let currentStatus = null;
let pollTimer = null;

let roadBgPos = 0;
let roadMoving = true;
let roadAnimId = null;
const roadSpeed = 1.2; // Adjust for desired speed

let countdownInterval = null;

function startPolling() {
	if (pollTimer) return; // Prevent multiple intervals
	pollTimer = setInterval(fetchStatus, 30000);
}

function stopPolling() {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
}

function secondsToHHMMSS(seconds) {
	const date = new Date(seconds * 1000);
	return date.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});
}

function animateRoad() {
	if (!roadMoving) return;
	roadBgPos -= roadSpeed;
	road.style.setProperty('--road-bg-x', `${roadBgPos}px`);
	roadAnimId = requestAnimationFrame(animateRoad);
}

function showBusStopAndStopRoad(data) {
	setBusStopTransition(roadSpeed);
	busStop.classList.remove('visible');
	busStop.classList.remove('hidden');
	setTimeout(() => {
		busStop.classList.add('visible');
	}, 20);
	busStop.addEventListener('transitionend', () => {
		stopRoad(data)
	}, { once: true });
}

function stopRoad(data) {
	roadMoving = false;
	if (roadAnimId) {
		cancelAnimationFrame(roadAnimId);
		updateMessages(
			data.stopName || 'Bus Status',
			currentStatus,
			'The bus has arrived!<br>Your keyword is: ' + data.keyword
		);
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
	busIcon.classList.add('hidden');
	busStop.classList.add('hidden');
}

function xorEncrypt(text, key) {
	let result = '';
	for (let i = 0; i < text.length; i++) {
		result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
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
		return (distance / 1000).toFixed(2) + 'km';
	} else {
		return distance + 'm';
	}
}

async function fetchStatus() {
	navigator.geolocation.getCurrentPosition(
		pos => {
			const { latitude, longitude } = pos.coords;
			const loc = JSON.stringify({ lat: latitude, lon: longitude });
			const encryptedLoc = xorEncrypt(loc, window.BUS_TOKEN);

			fetch('/status', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ loc: encryptedLoc, token: window.BUS_TOKEN })
			})
				.then(res => {
					if (res.status === 404) {
						res.json().then(data => {
							if (data.nearest) {
								const { stopName, stopLat, stopLon, distance } = data.nearest;
								updateMessages(
									'No Nearby Bus Stop',
									'NO BUS STOP',
									`
										Closest stop: <b>${stopName}</b><br>
										Distance: <b>${displayDistance(distance)}</b><br>
										<a href="https://www.google.com/maps/search/?api=1&query=${stopLat},${stopLon}" target="_blank">
											View in Google Maps
										</a>
									`
								);
							} else {
								updateMessages(
									'No Nearby Bus Stop',
									'NO BUS STOP',
									'Please go to a bus stop and try again.'
								);
							}
							stopEverything();
						});
						return null;
					}
					if (res.status === 403) {
						updateMessages(
							'Session Expired',
							'SESSION EXPIRED',
							'Please refresh the page to continue.'
						);
						stopEverything();
						return null;
					}
					return res.json();
				})
				.then(data => {
					if (!data) return;

					if (!data.estimatedTime || !data.scheduledTime || data.status === 'no_service') {
						updateMessages(
							data.stopName || 'Bus Status',
							'NO SERVICE',
							`
							The service is not currently running.<br>
							Please check back later.
						`
						);

						stopEverything();
						return;
					}

					busIcon.classList.remove('hidden');
					if (data.keyword) {
						stopPolling();
					}
					startCountdown(data);
				})
				.catch(e => {
					console.error(e);
					updateMessages(
						data.stopName || 'Bus Status',
						'ERROR',
						`
						Error loading status.<br>
						Please try again later.
						`
					);
					stopEverything();
				});
		},
		err => {
			updateMessages(
				'Could not get your location',
				'NO LOCATION',
				'Location access is required to find nearby bus stops.'
			);
			stopEverything();
		}
	);
}

function setBusStopTransition(roadSpeed) {
	const vw = window.innerWidth;
	// Get the offset in px (2rem or 1.2rem depending on screen size)
	const style = getComputedStyle(document.documentElement);
	const rem = parseFloat(style.fontSize);
	const offsetPx = window.matchMedia('(max-width: 600px)').matches ? 1.2 * rem : 2 * rem;

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
		currentStatus = data.status.replace('_', ' ');
		const now = Math.floor(Date.now() / 1000);
		let diff = data.estimatedTime - now;
		if (diff < 0) diff = 0;
		const mins = Math.floor(diff / 60);
		const secs = diff % 60;

		let delayMsg = '';
		const delayMins = Math.round(data.delay / 60);
		if (data.status == 'late') {
			delayMsg = `${delayMins} min `;
		} else if (data.status == 'early') {
			delayMsg = `${Math.abs(delayMins)} min `;
		}
		updateMessages(
			data.stopName || 'Bus Status',
			currentStatus,
			`
				The bus scheduled to arrive at<br>
				<b>${scheduled}</b><br>
				is ${delayMsg}${currentStatus} and will arrive in:<br>
				<b>${mins}m ${secs.toString().padStart(2, '0')}s</b>
			`
		);
		if (diff === 0) {
			clearInterval(countdownInterval);

			if (data.keyword) {
				showBusStopAndStopRoad(data);
			}
		}
	}

	updateCountdown();
	countdownInterval = setInterval(updateCountdown, 1000);
}

// Start the road animation when the page loads
roadMoving = true;
animateRoad();

window.addEventListener('resize', () => setBusStopTransition(roadSpeed));

startPolling();
fetchStatus();

// On initial render:
busStop.classList.add('no-transition');
setTimeout(() => {
	busStop.classList.remove('no-transition');
}, 100);
