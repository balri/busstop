const statusText = document.getElementById('statusText');
const busIcon = document.getElementById('busIcon');
const road = document.querySelector('.road');
const busStop = document.getElementById('bus-stop');
const timesText = document.getElementById('timesText');
const stopName = document.getElementById('stopName');

let animationId = null;
let driveToCentre = false;
let currentX = 0;
let currentStatus = null;
let start = null;
let duration = 6000; // 6 seconds for full left to right
let pollTimer = null;
let busParked = false;

let busWidth = busIcon.offsetWidth;
let roadWidth = road.offsetWidth;
let centreX = (roadWidth - busWidth) / 2;

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

function animateBus(timestamp) {
	if (busParked) return;

	if (!driveToCentre) {
		const speed = 100;
		if (!animateBus.lastTimestamp) animateBus.lastTimestamp = timestamp;
		const delta = timestamp - animateBus.lastTimestamp;
		animateBus.lastTimestamp = timestamp;

		currentX = (currentX + (speed * delta) / 1000) % (roadWidth - busWidth);
		busIcon.style.transform = `translateX(${currentX}px) translateY(-50%) scaleX(-1)`;

		animationId = requestAnimationFrame(animateBus);
	} else {
		const distance = centreX - currentX;
		if (Math.abs(distance) < 1) {
			currentX = centreX;
			busIcon.style.transform = `translateX(${currentX}px) translateY(-50%) scaleX(-1)`;
			busParked = true;
			cancelAnimationFrame(animationId);
			animationId = null;
		} else {
			currentX += distance * 0.05;
			busIcon.style.transform = `translateX(${currentX}px) translateY(-50%) scaleX(-1)`;
			animationId = requestAnimationFrame(animateBus);
		}
		showBusStop();
	}
}

function showBusStop() {
	busStop.classList.remove('hidden');
	requestAnimationFrame(() => {
		busStop.classList.add('visible');
	});
}

function xorEncrypt(text, key) {
	let result = '';
	for (let i = 0; i < text.length; i++) {
		result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
	}
	return btoa(result); // base64 encode for safe transport
}

animationId = requestAnimationFrame(animateBus);

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
								const { stop_name, stop_lat, stop_lon, distance } = data.nearest;
								stopName.textContent = 'No Nearby Bus Stop';
								statusText.innerHTML = `
											Closest stop: <b>${stop_name}</b><br>
											Distance: <b>${distance}m</b><br>
											<a href="https://www.google.com/maps/search/?api=1&query=${stop_lat},${stop_lon}" target="_blank">
												View in Google Maps
											</a>
										`;
							} else {
								stopName.textContent = 'No Nearby Bus Stop';
								statusText.textContent = 'Please go to a bus stop and try again.';
							}
							timesText.textContent = '';
							busIcon.classList.add('hidden');
							busStop.classList.add('hidden');
							stopPolling();
						});
						return null;
					}
					if (res.status === 403) {
						stopName.textContent = 'Session Expired';
						statusText.textContent = 'Please refresh the page to continue.';
						timesText.textContent = '';
						busIcon.classList.add('hidden');
						busStop.classList.add('hidden');
						stopPolling();
						return null;
					}
					return res.json();
				})
				.then(data => {
					if (!data) return;

					if (data.stopName) {
						stopName.textContent = data.stopName;
					} else {
						stopName.textContent = 'Bus Status';
					}

					if (!data.estimatedTime || !data.scheduledTime || data.status === 'no_service') {
						statusText.textContent = 'NO SERVICE';
						timesText.textContent = 'The service is not currently running. Please check back later.';

						busIcon.classList.add('hidden');
						busStop.classList.add('hidden');
						return;
					}

					busIcon.classList.remove('hidden');

					currentStatus = data.status.replace('_', ' ');
					const scheduled = secondsToHHMMSS(data.scheduledTime);
					const estimated = secondsToHHMMSS(data.estimatedTime);

					statusText.textContent = currentStatus.toUpperCase();
					timesText.innerHTML = 'Scheduled: ' + scheduled + '<br>Estimated: ' + estimated;

					if (data.keyword && !busParked) {
						driveToCentre = true;

						stopPolling();

						timesText.innerHTML = 'The bus will arrive ' + currentStatus + '!<br>Your keyword is: ' + data.keyword;
					} else {
						driveToCentre = false;
						busIcon.classList.remove('bus-parked');
					}

					if (!animationId) animationId = requestAnimationFrame(animateBus);
				})
				.catch(e => {
					console.error(e);
					statusText.textContent = 'Error loading status. Please try again later.';
				});
		},
		err => {
			stopName.textContent = 'Could not get your location';
			statusText.textContent = 'Location access is required to find nearby bus stops.';
			timesText.textContent = '';
			busIcon.classList.add('hidden');
			busStop.classList.add('hidden');
			stopPolling();

		}
	);
}

function recalculateDimensions() {
	const busRect = busIcon.getBoundingClientRect();
	busWidth = busRect.width;
	roadWidth = window.innerWidth;
	centreX = (roadWidth - busWidth) / 2;

	if (currentX > roadWidth - busWidth) {
		currentX = roadWidth - busWidth;
		busIcon.style.transform = `translateX(${currentX}px) translateY(-50%) scaleX(-1)`;
	}
}

window.addEventListener('resize', recalculateDimensions);
recalculateDimensions();

startPolling();
fetchStatus();

// On initial render:
busIcon.classList.add('no-transition');
busStop.classList.add('no-transition');
setTimeout(() => {
	busIcon.classList.remove('no-transition');
	busStop.classList.remove('no-transition');
}, 100);
