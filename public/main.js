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
	return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function animateRoad() {
	if (!roadMoving) return;
	roadBgPos -= roadSpeed;
	road.style.setProperty('--road-bg-x', `${roadBgPos}px`);
	roadAnimId = requestAnimationFrame(animateRoad);
}

function showBusStopAndStopRoad() {
	setBusStopTransition(roadSpeed);
	busStop.classList.remove('visible');
	busStop.classList.remove('hidden');
	setTimeout(() => {
		busStop.classList.add('visible');
	}, 20);
	busStop.addEventListener('transitionend', stopRoad, { once: true });
}

function stopRoad() {
	roadMoving = false;
	if (roadAnimId) {
		cancelAnimationFrame(roadAnimId);
		roadAnimId = null;
	}
}

function xorEncrypt(text, key) {
	let result = '';
	for (let i = 0; i < text.length; i++) {
		result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
	}
	return btoa(result); // base64 encode for safe transport
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
								busStopName.textContent = 'No Nearby Bus Stop';
								statusText.innerHTML = `
											Closest stop: <b>${stopName}</b><br>
											Distance: <b>${distance}m</b><br>
											<a href="https://www.google.com/maps/search/?api=1&query=${stopLat},${stopLon}" target="_blank">
												View in Google Maps
											</a>
										`;
							} else {
								busStopName.textContent = 'No Nearby Bus Stop';
								statusText.textContent = 'Please go to a bus stop and try again.';
							}
							timesText.textContent = '';
							busIcon.classList.add('hidden');
							busStop.classList.add('hidden');
							stopPolling();
							stopRoad();
						});
						return null;
					}
					if (res.status === 403) {
						busStopName.textContent = 'Session Expired';
						statusText.textContent = 'Please refresh the page to continue.';
						timesText.textContent = '';
						busIcon.classList.add('hidden');
						busStop.classList.add('hidden');
						stopPolling();
						stopRoad();
						return null;
					}
					return res.json();
				})
				.then(data => {
					if (!data) return;

					if (data.stopName) {
						busStopName.textContent = data.stopName;
					} else {
						busStopName.textContent = 'Bus Status';
					}

					if (!data.estimatedTime || !data.scheduledTime || data.status === 'no_service') {
						statusText.textContent = 'NO SERVICE';
						timesText.innerHTML = `
							The service is not currently running.<br>
							Please check back later.
						`;

						busIcon.classList.add('hidden');
						busStop.classList.add('hidden');
						return;
					}

					busIcon.classList.remove('hidden');

					currentStatus = data.status.replace('_', ' ');

					statusText.textContent = currentStatus.toUpperCase();
					startCountdown(data);
				})
				.catch(e => {
					console.error(e);
					statusText.innerHTML = `
						Error loading status.<br>
						Please try again later.
					`;
				});
		},
		err => {
			busStopName.textContent = 'Could not get your location';
			statusText.textContent = 'Location access is required to find nearby bus stops.';
			timesText.textContent = '';
			busIcon.classList.add('hidden');
			busStop.classList.add('hidden');
			stopPolling();
			stopRoad();
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
		timesText.innerHTML = `
			The bus scheduled to arrive at<br>
            <b>${scheduled}</b><br>
            is ${currentStatus} and will arrive in:<br>
            <b>${mins}m ${secs.toString().padStart(2, '0')}s</b>
		`;
		if (diff === 0) {
			clearInterval(countdownInterval);

			if (data.keyword) {
				stopPolling();
				timesText.innerHTML = 'The bus has arrived!<br>Your keyword is: ' + data.keyword;
				showBusStopAndStopRoad();
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
