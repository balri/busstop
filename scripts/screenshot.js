const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

(async () => {
	const browser = await puppeteer.launch({
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 375, height: 812, isMobile: true });

	const outDir = path.join(__dirname, "../screenshots");
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

	// Set your time range
	const start = new Date("2024-02-28T00:00:00Z");
	const end = new Date("2024-02-28T23:00:00Z");
	const intervalHours = 1;

	for (
		let t = new Date(start);
		t <= end;
		t.setHours(t.getHours() + intervalHours)
	) {
		const iso = t.toISOString();
		const url = `http://localhost:3000/?mockTime=${encodeURIComponent(iso)}`;
		await page.goto(url, { waitUntil: "networkidle2" });
		// Wait for rendering if needed
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const filename = `screenshot-${iso.replace(/[:.]/g, "-")}.png`;
		await page.screenshot({ path: path.join(outDir, filename) });
		console.log(`Saved screenshot for ${iso}`);
	}

	await browser.close();
})();
