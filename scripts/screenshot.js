const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const website = "http://localhost:3000/";

(async () => {
	const browser = await puppeteer.launch({
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--use-fake-ui-for-media-stream",
			"--enable-geolocation",
		],
	});
	const page = await browser.newPage();

	// Set geolocation permissions for your app's origin
	await page.goto(website);
	const context = browser.defaultBrowserContext();
	await context.overridePermissions(website, ["geolocation"]);

	// Set your desired location
	await page.setGeolocation({ latitude: -27.491992, longitude: 153.040728 });

	await page.setViewport({ width: 375, height: 812, isMobile: true });

	const outDir = path.join(__dirname, "../screenshots");
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

	const now = new Date();
	const iso = now.toISOString();
	const filename = `screenshot-${iso.replace(/[:.]/g, "-")}.png`;

	// Reload the page to ensure location is used from the start
	await page.goto(website, { waitUntil: "networkidle2" });

	// Wait for your app to render (increase timeout if needed)
	await new Promise((resolve) => setTimeout(resolve, 2000));

	await page.screenshot({ path: path.join(outDir, filename) });
	console.log(`Saved screenshot for ${iso}`);

	await browser.close();
})();
